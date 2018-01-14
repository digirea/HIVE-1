/**
 * @file RenderPlugin.cpp
 * hrenderコア機能部
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef HIVE_BUILD_WITH_OPENGL
#include "GLDevice/GLDevice.h"
#include "GLDevice/GLDeviceExtention.h"
#endif

#include "RenderCore.h"

#include "Commands.h"
#include "xtime.h"
#include <string>
#include <vector>
#include <map>
#include <algorithm>

#include "../RenderObject/RenderObject.h"
#include "../RenderObject/PolygonModel.h"
#include "../RenderObject/PointModel.h"
#include "../RenderObject/LineModel.h"
#include "../RenderObject/VectorModel.h"
#include "../RenderObject/TetraModel.h"
#include "../RenderObject/SolidModel.h"
#include "../RenderObject/VolumeModel.h"
#include "../RenderObject/SparseVolumeModel.h"
#include "../RenderObject/Camera.h"
#include "../RenderObject/PolygonModel.h"
#include "../Core/Ref.h"

#include "../Core/vxmath.h"

#include "PolygonBuffer.h"
#include "PointBuffer.h"
#include "LineBuffer.h"
#include "VolumeBuffer.h"
#include "SparseVolumeBuffer.h"
#include "VectorBuffer.h"
#include "TetraBuffer.h"
#include "SolidBuffer.h"

#include "../Buffer/Buffer.h"
#include "../Buffer/BufferImageData.h"
#include "../Image/ImageSaver.h"

#include "../Core/Path.h"
#include "../Core/Perf.h"


#ifdef HIVE_WITH_COMPOSITOR
extern "C" {
#include "234compositor.h"
}
#endif

#include "RenderPlugin.h"

namespace {

    ImageSaver m_imagesaver;

    inline std::string make_lowercase(const std::string& in)
    {
        std::string out;
        std::transform(in.begin(), in.end(), std::back_inserter(out), ::tolower);
        return out;
    }
    BufferImageData::FORMAT getImageBufferFomat(const std::string& filename, const std::string &imagebuffer_format)
    {
        if (filename.empty()) {
            // Determinte image buffer format by imagebuffer format.
            if (imagebuffer_format.compare("RGBA32F") == 0) {
                return BufferImageData::RGBA32F;
            } else if (imagebuffer_format.compare("RGBA8") == 0) {
                return BufferImageData::RGBA8;
            }
            
            return BufferImageData::INVALID;
        } else {
            // Determinte image buffer format by filename extension.
    
            std::string::size_type pos = filename.rfind('.');
            if (pos == std::string::npos) {
                return BufferImageData::INVALID;
            }
            
            const std::string ext = make_lowercase(filename.substr(pos + 1));
            if (ext == "jpg" || ext == "png") {
                return BufferImageData::RGBA8;
            } else if (ext == "hdr" || ext == "exr") {
                return BufferImageData::RGBA32F;
            } else {
                return BufferImageData::RGBA8;
            }
        }
    }
    
    bool (* const CreateProgramSrc_GS[])(const char*, unsigned int& prg) = {CreateProgramSrc_GL, CreateProgramSrc_SGL};
    bool (* const DeleteProgram_GS[])(unsigned int prg) = {DeleteProgram_GL, DeleteProgram_SGL};
    void (* const DeleteTextures_GS[])(int n, unsigned int* tex) = {DeleteTextures_GL, DeleteTextures_SGL};
    void (* const GenTextures_GS[])(int n, unsigned int* tex) = {GenTextures_GL, GenTextures_SGL};
    void (* const Clear_GS[])(float r, float g, float b, float a) = {Clear_GL, Clear_SGL};
    void (* const GetColorBuffer_GS[])(int w, int h, unsigned char* imgbuf, int colorbit) = {GetColorBuffer_GL, GetColorBuffer_SGL};
    void (* const GetDepthBuffer_GS[])(int w, int h, float* depthbuf) = {GetDepthBuffer_GL, GetDepthBuffer_SGL};
    
    void (* const CreateBuffer_GS[])(int w, int h, unsigned int& framebuffer, unsigned int& colorRenderbuffer, int colorbit, unsigned int& depthRenderbuffer, int depthbit) = {CreateBuffer_GL, CreateBuffer_SGL};
    void (* const ReleaseBuffer_GS[])(unsigned int framebuffer, unsigned int colorRenderbuffer, unsigned int depthRenderbuffer) = {ReleaseBuffer_GL, ReleaseBuffer_SGL};

}

/**
 * RenderPlugin
 */

/// コンストラクタ
RenderPlugin::RenderPlugin(RENDER_MODE mode)
{
    m_mode       = mode;
    m_clearcolor = VX::Math::vec4(0,0,0,0); // Always (0,0,0,0). we set clearcolor at readbacked.
    m_gs_depthbuffer = 0;
    m_gs_colorbuffer = 0;
    m_gs_framebuffer = 0;

    m_renderTimeout    = 0.2; // sec
    m_oldCallbackTime  = 0.0;
    m_progressCallback = defaultProgressCallbackFunc;
    
    
#ifndef USE_GLSL_CONFIG
    LSGL_CompilerSetting();
#endif
    SetCallback_SGL(RenderPlugin::progressCallbackFunc_, this);
    
    
    if (m_mode == RENDER_OPENGL) {
#ifdef HIVE_BUILD_WITH_OPENGL
        printf("Start OpenGL mode\n");
        GLDevice* dev = CreateGLDeviceInstance();
        bool r = dev->Init(256, 256, 32, 16, true);
        if (!r) {
            printf("[Error] Failed to initialize OpenGL mode\n");
            m_mode = RENDER_SURFACE;
        }
#else
        printf("[Error] Not Support OpenGL mode\n");
        m_mode = RENDER_SURFACE;
#endif
    }
    
#ifdef HIVE_WITH_COMPOSITOR
    m_compPixelType = ID_RGBA32;
    m_compInitialized = false;
#endif
}

/// デストラクタ
RenderPlugin::~RenderPlugin() {
    ReleaseBuffer_GS[m_mode](m_gs_framebuffer, m_gs_colorbuffer, m_gs_depthbuffer);
    
#ifdef HIVE_WITH_COMPOSITOR

#endif
}

bool RenderPlugin::progressCallbackFunc(int progress, int y, int height) {
    const double tm = GetTimeCount();
    const int minimumRenderingHeight = 16; // TODO: Now, FORCE rendering minimum size for Interactive rendring.
    if (height > minimumRenderingHeight
    && (tm - m_oldCallbackTime > m_renderTimeout)) {
        m_oldCallbackTime = tm;
        if (!m_progressCallback)
            return true;
        return m_progressCallback(static_cast<double>(progress));
    }
    return true;
}

/// LSGLコンパイラセッティング
void RenderPlugin::LSGL_CompilerSetting()
{
    std::string binaryPath = getBinaryDir();
#ifdef __APPLE__
    std::string binpath = "macosx64";
    std::string ccmd    = "clang++";
#elif _WIN32
    std::string binpath = "win64";
    std::string ccmd    = "g++";
#elif defined(__sparc__) || defined(__sparc_v9__)
    std::string binpath = "sparc64";
#ifdef HIVE_ENABLE_MPI
    std::string ccmd    = "mpiFCC";
#else
    std::string ccmd    = "FCC";
#endif
#elif __linux__
    std::string binpath = "linux_x64";
    std::string ccmd    = "g++";
#endif
    std::string opt      = "-O2";
    
    std::string mesaPath = binaryPath + "glsl/bin/" + binpath + "/glsl_compiler";
    std::string compilerCmd;
#ifdef _WIN32
    compilerCmd += binaryPath + std::string("glsl\\glslc.bat");
#else
    compilerCmd += binaryPath + std::string("glsl/glslc");
#endif
    compilerCmd += std::string(" --cxx=\"")      + ccmd     + std::string("\"");
    compilerCmd += std::string(" --cxxflags=\"") + opt      + std::string("\"");
    compilerCmd += std::string(" --mesacc=\"")   + mesaPath + std::string("\"");
    SetShaderCompiler_SGL(compilerCmd.c_str(), NULL);
}

/// バッファのクリア
void RenderPlugin::ClearBuffers()
{
    m_buffers.clear();
    
    TextureCache::const_iterator it, eit = m_textureCache.end();
    for (it = m_textureCache.begin(); it != eit; ++it) {
        unsigned int t = it->second;
        DeleteTextures_GS[m_mode](1, &t);
    }
    m_textureCache.clear();

    ShaderCache::const_iterator sit, seit = m_shaderCache.end();
    for (sit = m_shaderCache.begin(); sit != seit; ++sit) {
        const unsigned int p = sit->second;
        DeleteProgram_GS[m_mode](p);
    }
    m_shaderCache.clear();
    
}

void RenderPlugin::SetParallelRendering(bool enableParallel)
{
    if (m_mode != RENDER_SURFACE)
        return;
    SetScreenParallel_SGL(enableParallel, false);
}

/// レンダーオブジェクトの追加
/// @param robj レンダーオブジェクト
void RenderPlugin::AddRenderObject(RenderObject* robj)
{
    m_renderObjects.push_back(robj);
}

/// レンダーオブジェクトのクリア
void RenderPlugin::ClearRenderObject()
{
    m_renderObjects.clear();
}

/// プログレスコールバックの設定
void RenderPlugin::SetProgressCallback(bool (*func)(double))
{
    m_progressCallback = func;
}

bool RenderPlugin::GetTexture(const BufferImageData* bufimg, unsigned int& id)
{
    TextureCache::const_iterator it = m_textureCache.find(bufimg);
    if (it != m_textureCache.end()) {
        id = it->second;
        return true;
    }
    return false;
}

bool RenderPlugin::CreateTexture(const BufferImageData* bufimg, unsigned int& tex)
{
    TextureCache::const_iterator it = m_textureCache.find(bufimg);
    if (it != m_textureCache.end()) {
        DeleteTexture(bufimg);
    }
    GenTextures_GS[m_mode](1, &tex);
    m_textureCache[bufimg] = tex;
    return true;
}

bool RenderPlugin::DeleteTexture(const BufferImageData* bufimg)
{
    TextureCache::iterator it = m_textureCache.find(bufimg);
    if (it != m_textureCache.end()) {
        DeleteTextures_GS[m_mode](1, &it->second);
        m_textureCache.erase(it);
        return true;
    }
    return false;
}

bool RenderPlugin::CreateProgramSrc(const char* srcname, unsigned int& prg)
{
    ShaderCache::const_iterator it = m_shaderCache.find(srcname);
    if (it != m_shaderCache.end()) {
        prg = it->second;
        return true;
    }
    bool r = CreateProgramSrc_GS[m_mode](srcname, prg);
    if (!r)
        return false;
    m_shaderCache[std::string(srcname)] = prg;
    return true;
}

bool RenderPlugin::ClearShaderCache(const char* srcname)
{
    ShaderCache::iterator it = m_shaderCache.find(srcname);
    if (it != m_shaderCache.end()) {
        m_shaderCache.erase(it);
    }
    return true;
}

/// レンダリング
void RenderPlugin::Render()
{
    m_oldCallbackTime = 0.0;//GetTimeCount();
    RenderObjectArray::const_iterator it,eit = m_renderObjects.end();
    for (it = m_renderObjects.begin(); it != eit; ++it)
    {
        if ((*it)->GetType() == RenderObject::TYPE_CAMERA) {
            PMon::Start("HiveCore::Render");
            Camera* camera = static_cast<Camera*>(it->Get());
            const std::string& outfile = camera->GetOutputFile();
            const std::string& depth_outfile = camera->GetDepthOutputFile();
            const std::string& imagebuffer_format = camera->GetImageBufferFormat();
            BufferImageData::FORMAT colorfmt = getImageBufferFomat(outfile, imagebuffer_format);
            BufferImageData* color = camera->GetImageBuffer();
            BufferImageData* depth = camera->GetDepthBuffer();
            
            const double starttm = GetTimeCount();
            resize(camera);
            const double resizetm = GetTimeCount();
            setCurrentCamera(camera);
            renderObjects();
            PMon::Stop("HiveCore::Render");
            const double rendertm = GetTimeCount();
            const float* clr = camera->GetClearColor();
#if defined(HIVE_WITH_COMPOSITOR)
            PMon::Start("Compositor");
#endif
            readbackImage(colorfmt, color, clr[0], clr[1], clr[2], clr[3]);
            readbackDepth(depth);
#if defined(HIVE_WITH_COMPOSITOR)
            PMon::Stop("Compositor");
#endif
            const double readbacktm = GetTimeCount();

            PMon::Start("HiveCore::ImageSave");

#ifdef HIVE_ENABLE_MPI
            int rank = 0;
            MPI_Comm_rank(MPI_COMM_WORLD, &rank);
            if (rank == 0) {
#endif
            
            if (!outfile.empty()) {
                m_imagesaver.Save(outfile.c_str(), color);
            }
            if (!depth_outfile.empty()) {
                m_imagesaver.Save(depth_outfile.c_str(), depth);
            }
                
#ifdef HIVE_ENABLE_MPI
            }
#endif
            PMon::Stop("HiveCore::ImageSave");
            const double savetm = GetTimeCount();
            //printf("[HIVE] Resize=%.3f DrawCall=%.3f Readback=%.3f Save=%.3f\n", resizetm-starttm, rendertm-resizetm, readbacktm-rendertm, savetm-readbacktm);
        }
    }
}


/// カレントカメラのセット
/// @param camera カメラ
void RenderPlugin::setCurrentCamera(const Camera* camera)
{
    m_currentCamera = camera;
}

/// SGLバッファの作成
/// @param robj レンダーオブジェクト
BaseBuffer* RenderPlugin::createBuffer(const RenderObject* robj)
{
    RenderPlugin* render = this;
    BaseBuffer* buffer = 0;
    if (robj->GetType() == RenderObject::TYPE_POLYGON) {
        PolygonBuffer* pbuf = new PolygonBuffer(render);
        pbuf->Create(static_cast<const PolygonModel*>(robj));
        buffer = pbuf;
    } else if (robj->GetType() == RenderObject::TYPE_POINT) {
        PointBuffer* pbuf = new PointBuffer(render);
        pbuf->Create(static_cast<const PointModel*>(robj));
        buffer = pbuf;
    } else if (robj->GetType() == RenderObject::TYPE_LINE) {
        LineBuffer* lbuf = new LineBuffer(render);
        lbuf->Create(static_cast<const LineModel*>(robj));
        buffer = lbuf;
    } else if (robj->GetType() == RenderObject::TYPE_VOLUME) {
         VolumeBuffer* vbuf = new VolumeBuffer(render);
         vbuf->Create(static_cast<const VolumeModel*>(robj));
         buffer = vbuf;
    } else if (robj->GetType() == RenderObject::TYPE_SPARSEVOLUME) {
         SparseVolumeBuffer* vbuf = new SparseVolumeBuffer(render);
         vbuf->Create(static_cast<const SparseVolumeModel*>(robj));
         buffer = vbuf;
    } else if (robj->GetType() == RenderObject::TYPE_TETRA) {
        TetraBuffer* tbuf = new TetraBuffer(render);
        tbuf->Create(static_cast<const TetraModel*>(robj));
        buffer = tbuf;
    } else if (robj->GetType() == RenderObject::TYPE_SOLID) {
        SolidBuffer* tbuf = new SolidBuffer(render);
        tbuf->Create(static_cast<const SolidModel*>(robj));
        buffer = tbuf;
    } else if (robj->GetType() == RenderObject::TYPE_VECTOR) {
         VectorBuffer* vbuf = new VectorBuffer(render);
         vbuf->Create(static_cast<const VectorModel*>(robj));
         buffer = vbuf;
    } else {
        // Unknow type
        fprintf(stderr,"Unkown RenderObjet type:\n");
        assert(0);
    }
    return buffer;
}

/// SGLで描画
/// @param robj レンダーオブジェクト
void RenderPlugin::draw(const RenderObject* robj)
{
    if (robj->GetType() == RenderObject::TYPE_CAMERA) {
        return;
    }
    
    BaseBuffer* buffer = 0;
    BufferMap::const_iterator it = m_buffers.find(robj);
    if (it != m_buffers.end()) {
        buffer = it->second.Get();
    } else {
        BaseBuffer* buf = createBuffer(robj);
        m_buffers[robj] = buf;
        buffer = buf;
    }

    assert(buffer);

    const float res[] = {m_width, m_height};
    buffer->Update();
    buffer->BindProgram();
    buffer->Uniform2fv("resolution", res);
    buffer->Uniform4fv("backgroundColor", &m_clearcolor.x);
    buffer->SetCamera(m_currentCamera);
    buffer->Render();
    buffer->UnbindProgram();
    
}

/// 画像の書き戻し
/// @param color カラーバッファ
void RenderPlugin::readbackDepth(BufferImageData* depth)
{
    FloatBuffer* fbuf = depth->FloatImageBuffer();
    if (fbuf) {
        float* imgbuf = fbuf->GetBuffer();
        GetDepthBuffer_GS[m_mode](m_width, m_height, imgbuf);

#ifdef HIVE_WITH_COMPOSITOR
        // 234 compositor does not support Z only compositing at this time.
        // Thus we simply use MPI_Reduce o merge image.
        
        int rank;
        int nnodes;
        MPI_Comm_rank(MPI_COMM_WORLD, &rank);
        MPI_Comm_size(MPI_COMM_WORLD, &nnodes);

        if (nnodes > 1) {

            int n = m_width * m_height;
            std::vector<float> buf(n);
            memcpy(&buf.at(0), imgbuf, n * sizeof(float));

            MPI_Barrier(MPI_COMM_WORLD);

            // Assume screen parallel rendering(i.e. no image overlapping),
            int ret = MPI_Reduce(&buf.at(0), reinterpret_cast<void*>(imgbuf), n, MPI_FLOAT, MPI_MIN, 0, MPI_COMM_WORLD);

            MPI_Barrier(MPI_COMM_WORLD);
        }

#endif

    }
}
/// 画像の書き戻し
/// @param color カラーバッファ
void RenderPlugin::readbackImage(BufferImageData::FORMAT format, BufferImageData* color, float clr_r, float clr_g, float clr_b, float clr_a)
{
    const float clearcolor_r = clr_r;
    const float clearcolor_g = clr_g;
    const float clearcolor_b = clr_b;
    const float clearcolor_a = clr_a;

    if (format == BufferImageData::RGBA8) {
        ByteBuffer* bbuf = color->ImageBuffer();
        if (!bbuf) { return; }
        unsigned char* imgbuf = bbuf->GetBuffer();
        const int colorbit = 8;
        GetColorBuffer_GS[m_mode](m_width, m_height, imgbuf, colorbit);
    
#ifdef HIVE_WITH_COMPOSITOR
        int rank;
        int nnodes;
        MPI_Comm_rank(MPI_COMM_WORLD, &rank);
        MPI_Comm_size(MPI_COMM_WORLD, &nnodes);

        if (nnodes > 1) {

            // Assume m_compPixelType == ID_RGBA32
            assert(m_compPixelType == ID_RGBA32);
            Do_234Composition(rank, nnodes, m_width, m_height, m_compPixelType, ALPHA_BtoF, imgbuf, MPI_COMM_WORLD );
        }
#endif

        // merge to bgcolor
        for (int y = 0; y < m_height; ++y) {
            for (int x = 0; x < m_width; ++x) {
                const double alp = imgbuf[4*(x + y * m_width) + 3]/255.0;
                imgbuf[4*(x + y * m_width) + 0] = imgbuf[4*(x + y * m_width) + 0] * alp + 255.0*clearcolor_r*clearcolor_a * (1.0 - alp);
                imgbuf[4*(x + y * m_width) + 1] = imgbuf[4*(x + y * m_width) + 1] * alp + 255.0*clearcolor_g*clearcolor_a * (1.0 - alp);
                imgbuf[4*(x + y * m_width) + 2] = imgbuf[4*(x + y * m_width) + 2] * alp + 255.0*clearcolor_b*clearcolor_a * (1.0 - alp);
                imgbuf[4*(x + y * m_width) + 3] = (std::max)(0, (std::min)(255, static_cast<int>(255 * (alp + clearcolor_a))));
            }
        }
    } else {
        FloatBuffer* fbuf = color->FloatImageBuffer();
        if (!fbuf) { return; }
        float* imgbuf = fbuf->GetBuffer();
        const int colorbit = 32;
        GetColorBuffer_GS[m_mode](m_width, m_height, reinterpret_cast<unsigned char*>(imgbuf), colorbit);

#ifdef HIVE_WITH_COMPOSITOR
        int rank;
        int nnodes;
        MPI_Comm_rank(MPI_COMM_WORLD, &rank);
        MPI_Comm_size(MPI_COMM_WORLD, &nnodes);
        
        if (nnodes > 1) {
            Do_234Composition(rank, nnodes, m_width, m_height, m_compPixelType, ALPHA_BtoF, imgbuf, MPI_COMM_WORLD );
        }
#endif
        
        // merge to bgcolor
        for (int y = 0; y < m_height; ++y) {
            for (int x = 0; x < m_width; ++x) {
                const double alp = imgbuf[4*(x + y * m_width) + 3];
                const float R = imgbuf[4*(x + y * m_width) + 0] * alp + clearcolor_r * clearcolor_a * (1.0 - alp);
                const float G = imgbuf[4*(x + y * m_width) + 1] * alp + clearcolor_g * clearcolor_a * (1.0 - alp);
                const float B = imgbuf[4*(x + y * m_width) + 2] * alp + clearcolor_b * clearcolor_a * (1.0 - alp);
                imgbuf[4*(x + y * m_width) + 0] = R;
                imgbuf[4*(x + y * m_width) + 1] = G;
                imgbuf[4*(x + y * m_width) + 2] = B;
                imgbuf[4*(x + y * m_width) + 3] = alp + clearcolor_a;
            }
        }
    }

}

/// オブジェクトのレンダリング
void RenderPlugin::renderObjects()
{
    //printf("RenderCore::RENDER!!!!\n");
    
    if (m_mode == RENDER_SURFACE) {
        //SampleCoverage_SGL(m_fsaa, 0);
        //PixelStep_SGL(m_pixelstep);
    }
    
    Clear_GS[m_mode](m_clearcolor.x, m_clearcolor.y, m_clearcolor.z, m_clearcolor.w);
    
    RenderObjectArray::const_iterator it,eit = m_renderObjects.end();
    for (it = m_renderObjects.begin(); it != eit; ++it)
    {
        draw((*it));
    }
    
    //BindProgram_SGL(0); // TODO: not need to release?
    
}

/// リサイズ
/// @param camera カメラ
void RenderPlugin::resize(Camera* camera)
{
    const std::string& outfile = camera->GetOutputFile();
    const std::string& imagebuffer_format = camera->GetImageBufferFormat();
    BufferImageData::FORMAT colorfmt = getImageBufferFomat(outfile, imagebuffer_format);
    
    BufferImageData* color = camera->GetImageBuffer();
    BufferImageData* depth = camera->GetDepthBuffer();
    const int w = camera->GetScreenWidth();
    const int h = camera->GetScreenHeight();
    
    ByteBuffer* bbuf = color->ImageBuffer();
    if (w == m_width && h == m_height && bbuf != 0) {
        return;
    }

    if (m_gs_framebuffer || m_gs_colorbuffer || m_gs_depthbuffer)
        ReleaseBuffer_GS[m_mode](m_gs_framebuffer, m_gs_colorbuffer, m_gs_depthbuffer);
    
    const int colorbit = (colorfmt == BufferImageData::RGBA32F ? 32 : 8);
    CreateBuffer_GS[m_mode](w, h, m_gs_framebuffer, m_gs_colorbuffer, colorbit, m_gs_depthbuffer, 32);

#ifdef HIVE_WITH_COMPOSITOR
    int rank;
    int nnodes;
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &nnodes);

    m_compPixelType = (colorfmt == BufferImageData::RGBA32F ? ID_RGBA128 : ID_RGBA32);

    // Re-allocate compositor buffer for the change of screen resolution.
    // @fixme { Support various image format. Currently only RGBA 8bit allowd. }
    if (m_width != w || m_height != h) {
        if (m_width == 0 || m_height ==0) { // Assume first call of resize() function.
        } else {
            Destroy_234Composition(m_compPixelType);
        }
        Init_234Composition (rank, nnodes, w, h, m_compPixelType);
        m_compInitialized = true;
    }
#endif
    
    m_width  = w;
    m_height = h;
    
    if (color->Width() != w || color->Height() != h) {
        color->Clear();
        depth->Clear();
        if (w != 0 && h != 0) {
            if (colorfmt == BufferImageData::INVALID) {
                colorfmt = BufferImageData::RGBA8;
            }
            color->Create(colorfmt, w, h);
            depth->Create(BufferImageData::R32F,  w, h);
        }
    }
}


