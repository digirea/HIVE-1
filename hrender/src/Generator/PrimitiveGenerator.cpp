#include "PrimitiveGenerator.h"
#include "BufferMeshData.h"
#include "BufferPointData.h"
#include "BufferLineData.h"
#include "BufferTetraData.h"
#include "BufferVectorData.h"
#include "Buffer.h"
#include <string.h>

PrimitiveGenerator::PrimitiveGenerator()
{
}

PrimitiveGenerator::~PrimitiveGenerator()
{
}

BufferMeshData* PrimitiveGenerator::Quad(float width, float height) const
{
    BufferMeshData* mesh  = new BufferMeshData();
    mesh->Create(6, 6); // facevarying triangles.
    Vec3Buffer* pos      = mesh->Position();
    Vec3Buffer* normal   = mesh->Normal();
    FloatBuffer* mat     = mesh->Material();
    UintBuffer* index    = mesh->Index();
    Vec2Buffer* texcoord = mesh->Texcoord();

    float vertices[] = {
        -1.0f*width, -1.0f*height, 0.0f,
         1.0f*width, -1.0f*height, 0.0f,
        -1.0f*width,  1.0f*height, 0.0f,

        -1.0f*width,  1.0f*height, 0.0f,
         1.0f*width, -1.0f*height, 0.0f,
         1.0f*width,  1.0f*height, 0.0f
    };

    float normals[] = {
         0.0f,  0.0f, 1.0f,
         0.0f,  0.0f, 1.0f,
         0.0f,  0.0f, 1.0f,

         0.0f,  0.0f, 1.0f,
         0.0f,  0.0f, 1.0f,
         0.0f,  0.0f, 1.0f
    };

    float uvs[] = {
         0.0f,  0.0f,
         1.0f,  0.0f,
         0.0f,  1.0f,

         0.0f,  1.0f,
         1.0f,  0.0f,
         1.0f,  1.0f
    };

    int indices[] = {0, 1, 2, 3, 4, 5};
    
    int numVerts = 6;
    int numIndices = 6;

    pos->Create(numVerts);
    float* pp = pos->GetBuffer();
    memcpy(pp, vertices, sizeof(float)*3*numVerts);
    normal->Create(numVerts);
    memcpy(normal->GetBuffer(), normals, sizeof(float)*3*numVerts);
    texcoord->Create(numVerts);
    float* uv = texcoord->GetBuffer();
    memcpy(uv, uvs, sizeof(float)*2*numVerts);
    mat->Create(numVerts);
    memset(mat->GetBuffer(), 0, sizeof(float) * numVerts);
    index->Create(numIndices);
    memcpy(index->GetBuffer(), indices, sizeof(unsigned int) * numIndices);

    return mesh;
}

BufferPointData* PrimitiveGenerator::Sphere(float radius) const
{
    BufferPointData* point = new BufferPointData();

    point->Create(1);
    Vec3Buffer*  pos     = point->Position();
    FloatBuffer* mat     = point->Material();
    FloatBuffer* rad     = point->Radius();

    float vertices[] = {0.0f, 0.0f, 0.0f};

    float* pp = pos->GetBuffer();
    memcpy(pp, vertices, sizeof(float)*3);

    float* rp = rad->GetBuffer();
    rp[0] = radius;

    memset(mat->GetBuffer(), 0, sizeof(float));

    return point;
}
