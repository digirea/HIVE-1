/**
 * @file HdmLoader.cpp
 * HDMデータローダー
 */

#ifndef HIVE_WITH_HDMLIB
#error "HIVE_WITH_HDMLIB must be defined when you compile HDMLoader module"
#endif

#include <mpi.h> // must include mpi.h befor stdio.h for Intel MPI compiler.

#include <stdio.h>
#include <string.h>

#include <string>

#include "HdmLoader.h"
#include "SimpleVOL.h"
#include "BufferVolumeData.h"

#include "BlockFactory.h"
#include "Block.h"
#include "BlockManager.h"
#include "Scalar3D.h"

#include "BCMTools.h"
#include "BoundaryConditionSetterBase.h"
#include "BCMOctree.h"
#include "BoundaryInfo.h"

#include "BCMFileLoader.h"
#include "BCMFileSaver.h"

/// コンストラクタ
HDMLoader::HDMLoader() { Clear(); }

/// デストラクタ
HDMLoader::~HDMLoader() { Clear(); }

/// ボリュームクリア
void HDMLoader::Clear() { m_sparseVolume.Clear(); }

namespace
{

template <typename T> class VoxelBlock
{
  public:
	VoxelBlock() : id(-1){};

	~VoxelBlock(){};

	void Resize(int sx, int sy, int sz)
	{
		data.resize(sx * sy * sz);
		size[0] = sx;
		size[1] = sy;
		size[2] = sz;
	}

	int size[3];
	int offset[3];
	std::vector<T> data;
	int id;
};

typedef enum
{
	TYPE_UNKNOWN,
	TYPE_FLOAT32,
	TYPE_FLOAT64,
} DataType;

DataType ParseDataType(const std::string &type)
{
	if (type == "Float32")
	{
		return TYPE_FLOAT32;
	}
	else if (type == "Float64")
	{
		return TYPE_FLOAT64;
	}

	return TYPE_UNKNOWN;
}

// From HDMlib example.
class BoundaryConditionSetter : public BoundaryConditionSetterBase
{

  public:
	BoundaryConditionSetter() {}

	~BoundaryConditionSetter() {}

	BoundaryInfo *operator()(const Node *node, const BCMOctree *tree)
	{
		BoundaryInfo *boundaryInfo = new BoundaryInfo[NUM_FACE];

		// Set boundary condition
		for (int i = 0; i < NUM_FACE; i++)
		{
			Face face = Face(i);
			if (tree->checkOnOuterBoundary(node, face))
			{
				boundaryInfo[face].setType(BoundaryInfo::DIRICHLET);
				boundaryInfo[face].setID(0);
			}
		}

		return boundaryInfo;
	}
};

template <typename T>
void print(const char *prefix, const int dcid, const int vc = 0)
{
	BlockManager &blockManager = BlockManager::getInstance();
	const MPI::Intracomm &comm = blockManager.getCommunicator();
	Vec3i sz = blockManager.getSize();

	char name[128];
	sprintf(name, "%s_%03d.txt", prefix, comm.Get_rank());
	FILE *fp = fopen(name, "w");
	for (int id = 0; id < blockManager.getNumBlock(); ++id)
	{
		BlockBase *block = blockManager.getBlock(id);

		Scalar3D<T> *mesh =
			dynamic_cast<Scalar3D<T> *>(block->getDataClass(dcid));
		T *data = mesh->getData();
		Index3DS idx = mesh->getIndex();

		fprintf(fp, "Data[%3d] (vc : %d) \n", id, vc);
		for (int z = -vc; z < sz.z + vc; z++)
		{
			for (int y = -vc; y < sz.y + vc; y++)
			{
				for (int x = -vc; x < sz.x + vc; x++)
				{
					fprintf(fp, "%g ", data[idx(x, y, z)]);
				}
				fprintf(fp, "\n");
			}
			fprintf(fp, "\n");
		}
		fprintf(fp, "\n");
	}
	fclose(fp);
	printf("dbg: output %s\n", name);
}

template <typename T>
void LoadBlockCellScalar(VoxelBlock<T> &block, Scalar3D<T> *mesh, Vec3i sz,
						 size_t level, size_t maxLevel, size_t rootDim[3],
						 const Vec3d &org, const Vec3d &globalOrigin,
						 const Vec3d &pitch, const Vec3d &globalRegion)
{
	T *data = mesh->getData();
	Index3DS idx = mesh->getIndex();

	// Compute voxel size in global voxel resolutuon
	size_t dx = sz.x * (1 << (maxLevel - level));
	size_t dy = sz.y * (1 << (maxLevel - level));
	size_t dz = sz.z * (1 << (maxLevel - level));

	size_t bx = (1 << (maxLevel - level));
	size_t by = (1 << (maxLevel - level));
	size_t bz = (1 << (maxLevel - level));

	size_t ox = sz.x * rootDim[0] *
				((1 << (maxLevel - level)) *
				 ((double)(org.x - globalOrigin.x) / (double)globalRegion.x));
	size_t oy = sz.y * rootDim[1] *
				((1 << (maxLevel - level)) *
				 ((double)(org.y - globalOrigin.y) / (double)globalRegion.y));
	size_t oz = sz.z * rootDim[2] *
				((1 << (maxLevel - level)) *
				 ((double)(org.z - globalOrigin.z) / (double)globalRegion.z));
	ox = (std::min)(rootDim[0] * dx, ox);
	oy = (std::min)(rootDim[1] * dy, oy);
	oz = (std::min)(rootDim[2] * dz, oz);
	// printf("lv = %d\n", level);
	// printf("org = %f, %f, %f\n", org.x, org.y, org.z);
	// printf("pitch = %f, %f, %f\n", pitch.x, pitch.y, pitch.z);
	// printf("o = %d, %d, %d, d = %d, %d, %d\n", ox, oy, oz, dx, dy, dz);
	// printf("%f\n", rootDim[0] * sz.x * (1 << (maxLevel - level)) *
	// (double)(org.x - globalOrigin.x) / (double)globalRegion.x);

	block.Resize(dx, dy, dz);
	block.offset[0] = ox;
	block.offset[1] = oy;
	block.offset[2] = oz;

	// NOTE: Skip virtual Cell
	for (size_t z = 0; z < sz.z; z++)
	{
		for (size_t y = 0; y < sz.y; y++)
		{
			for (size_t x = 0; x < sz.x; x++)
			{
				T val = data[idx(x, y, z)];

				// Splat voxel value
				for (size_t w = 0; w < bz; w++)
				{
					for (size_t v = 0; v < by; v++)
					{
						for (size_t u = 0; u < bx; u++)
						{
							block.data[(z * bz + w) * dy * dx +
									   (y * by + v) * dx + (x * bx + u)] = val;
						}
					}
				}
			}
		}
	}
}

template <typename T>
void LoadBlockCellVector(VoxelBlock<T> &block, Scalar3D<T> *U, Scalar3D<T> *V,
						 Scalar3D<T> *W, Vec3i sz, size_t level,
						 size_t maxLevel, size_t rootDim[3], const Vec3d &org,
						 const Vec3d &globalOrigin, const Vec3d &pitch,
						 const Vec3d &globalRegion)
{

	// Assume U, V and W has all same data layout.
	T *dataU = U->getData();
	T *dataV = V->getData();
	T *dataW = W->getData();

	Index3DS idx = U->getIndex();

	// Compute voxel size in global voxel resolutuon
	size_t dx = sz.x * (1 << (maxLevel - level));
	size_t dy = sz.y * (1 << (maxLevel - level));
	size_t dz = sz.z * (1 << (maxLevel - level));

	size_t bx = (1 << (maxLevel - level));
	size_t by = (1 << (maxLevel - level));
	size_t bz = (1 << (maxLevel - level));

	size_t ox = sz.x * rootDim[0] *
				((1 << (maxLevel - level)) *
				 ((double)(org.x - globalOrigin.x) / (double)globalRegion.x));
	size_t oy = sz.y * rootDim[1] *
				((1 << (maxLevel - level)) *
				 ((double)(org.y - globalOrigin.y) / (double)globalRegion.y));
	size_t oz = sz.z * rootDim[2] *
				((1 << (maxLevel - level)) *
				 ((double)(org.z - globalOrigin.z) / (double)globalRegion.z));
	ox = (std::min)(rootDim[0] * dx, ox);
	oy = (std::min)(rootDim[1] * dy, oy);
	oz = (std::min)(rootDim[2] * dz, oz);
	// printf("lv = %d\n", level);
	// printf("org = %f, %f, %f\n", org.x, org.y, org.z);
	// printf("pitch = %f, %f, %f\n", pitch.x, pitch.y, pitch.z);
	// printf("o = %d, %d, %d, d = %d, %d, %d\n", ox, oy, oz, dx, dy, dz);
	// printf("%f\n", rootDim[0] * sz.x * (1 << (maxLevel - level)) *
	// (double)(org.x - globalOrigin.x) / (double)globalRegion.x);

	block.Resize(dx, dy, dz);
	block.offset[0] = ox;
	block.offset[1] = oy;
	block.offset[2] = oz;

	// NOTE: Skip virtual Cell
	for (size_t z = 0; z < sz.z; z++)
	{
		for (size_t y = 0; y < sz.y; y++)
		{
			for (size_t x = 0; x < sz.x; x++)
			{
				T valU = dataU[idx(x, y, z)];
				T valV = dataV[idx(x, y, z)];
				T valW = dataW[idx(x, y, z)];

				// Splat voxel value
				for (size_t w = 0; w < bz; w++)
				{
					for (size_t v = 0; v < by; v++)
					{
						for (size_t u = 0; u < bx; u++)
						{
							block.data[3 * ((z * bz + w) * dy * dx +
											(y * by + v) * dx + (x * bx + u)) +
									   0] = valU;
							block.data[3 * ((z * bz + w) * dy * dx +
											(y * by + v) * dx + (x * bx + u)) +
									   0] = valV;
							block.data[3 * ((z * bz + w) * dy * dx +
											(y * by + v) * dx + (x * bx + u)) +
									   0] = valW;
						}
					}
				}
			}
		}
	}
}

template <typename T>
void ConvertLeafBlockScalar(BufferSparseVolumeData &sparseVolume,
							const int dcid, size_t maxLevel, size_t rootDim[3],
							const Vec3d &globalOrigin,
							const Vec3d &globalRegion)
{
	BlockManager &blockManager = BlockManager::getInstance();
	const MPI::Intracomm &comm = blockManager.getCommunicator();
	Vec3i sz = blockManager.getSize();

	for (int id = 0; id < blockManager.getNumBlock(); ++id)
	{
		BlockBase *block = blockManager.getBlock(id);

		size_t level = block->getLevel();
		const Vec3d &org = block->getOrigin();
		const Vec3d &pitch = block->getCellSize();

		Scalar3D<T> *mesh =
			dynamic_cast<Scalar3D<T> *>(block->getDataClass(dcid));

		VoxelBlock<T> vb;
		LoadBlockCellScalar(vb, mesh, sz, level, maxLevel, rootDim, org,
							globalOrigin, pitch, globalRegion);
		vb.id = id;

		BufferVolumeData *vol = new BufferVolumeData();
		vol->Create(vb.size[0], vb.size[1], vb.size[2], /* components */ 1);

		//printf("offset = %d, %d, %d\n", vb.offset[0], vb.offset[1], vb.offset[2]);
		// Implicitly convert voxel data to float precision if T is double.
		for (size_t i = 0; i < vb.size[0] * vb.size[1] * vb.size[2]; i++)
		{
			vol->Buffer()->GetBuffer()[i] = vb.data[i];
		}

		sparseVolume.AddVolume(vb.offset[0], vb.offset[1], vb.offset[2], vol);
	}
}

template <typename T>
void ConvertLeafBlockVector(BufferSparseVolumeData &sparseVolume,
							const int dcid[3], size_t maxLevel,
							size_t rootDim[3], const Vec3d &globalOrigin,
							const Vec3d &globalRegion)
{
	BlockManager &blockManager = BlockManager::getInstance();
	const MPI::Intracomm &comm = blockManager.getCommunicator();
	Vec3i sz = blockManager.getSize();

	for (int id = 0; id < blockManager.getNumBlock(); ++id)
	{
		BlockBase *block = blockManager.getBlock(id);

		size_t level = block->getLevel();
		const Vec3d &org = block->getOrigin();
		const Vec3d &pitch = block->getCellSize();

		Scalar3D<T> *meshU =
			dynamic_cast<Scalar3D<T> *>(block->getDataClass(dcid[0]));
		Scalar3D<T> *meshV =
			dynamic_cast<Scalar3D<T> *>(block->getDataClass(dcid[1]));
		Scalar3D<T> *meshW =
			dynamic_cast<Scalar3D<T> *>(block->getDataClass(dcid[2]));

		VoxelBlock<T> vb;
		LoadBlockCellVector(vb, meshU, meshV, meshW, sz, level, maxLevel,
							rootDim, org, globalOrigin, pitch, globalRegion);
		vb.id = id;

		BufferVolumeData *vol = new BufferVolumeData();
		vol->Create(vb.size[0], vb.size[1], vb.size[2], /* components */ 3);

		// Implicitly convert voxel data to float precision if T is double.
		for (size_t i = 0; i < vb.size[0] * vb.size[1] * vb.size[2] * 3; i++)
		{
			vol->Buffer()->GetBuffer()[i] = vb.data[i];
		}

		sparseVolume.AddVolume(vb.offset[0], vb.offset[1], vb.offset[2], vol);
	}
}
}

/**
 * HDMデータのロード
 * @param cellidFilename Cell ID ファイルパス
 * @param dataFilename   data ファイルパス
 * @param fieldName      field name
 * @param fieldType      field type("Float32", "Float64", etc)
 * @param components     The number of components(1 = scalar, 3 = vector)
 * @param timeStepIndex  Time step index
 * @param virtualCells   The number of virtual cells(Usually 2)
 * @retval true 成功
 * @retval false 失敗
 */
bool HDMLoader::Load(const char *cellidFilename, const char *dataFilename,
					 const char *fieldName, const char *fieldType,
					 int components, int timeStepIndex, int virtualCells)
{
	Clear();

	if (components == 1 || components == 3)
	{
		// OK
	}
	else
	{
		fprintf(stderr, "[HDMLoader] components must be 1 or 3, but %d given\n",
				components);
		return false;
	}

	DataType type = ParseDataType(fieldType);
	if (type == TYPE_UNKNOWN)
	{
		fprintf(stderr, "[HDMLoader] Unsupported field type: %s\n", fieldType);
		return false;
	}

	// cellid.bcm
	BoundaryConditionSetter *bcsetter = new BoundaryConditionSetter;
	BCMFileIO::BCMFileLoader loader(cellidFilename, bcsetter);
	delete bcsetter;

	const Vec3d &globalOrigin = loader.GetGlobalOrigin();
	const Vec3d &globalRegion = loader.GetGlobalRegion();

	BlockManager &blockManager = BlockManager::getInstance();
	blockManager.printBlockLayoutInfo();

	// Find max level
	int maxLevel = -1;
	for (int id = 0; id < blockManager.getNumBlock(); ++id)
	{
		int level = blockManager.getBlock(id)->getLevel();
		maxLevel = (level > maxLevel) ? level : maxLevel;
	}
	// printf("maxLevel = %d\n", maxLevel);

	// data.bcm
	if (!loader.LoadAdditionalIndex(dataFilename))
	{
		fprintf(stderr, "[HDMLoader] Load File Error %s\n", dataFilename);
		return false;
	}

	//
	const BCMOctree *octree = loader.GetOctree();
	const RootGrid *rootGrid = octree->getRootGrid();

	Vec3i lbSize = blockManager.getSize();
	size_t rootDim[3];
	rootDim[0] = rootGrid->getSizeX();
	rootDim[1] = rootGrid->getSizeY();
	rootDim[2] = rootGrid->getSizeZ();

	// Voxel resolution at the maximum level = rootGridSize * (2^maxLevel) *
	// leafBlockSize
	size_t dim[3];
	dim[0] = (1 << maxLevel) * lbSize.x * rootDim[0];
	dim[1] = (1 << maxLevel) * lbSize.y * rootDim[1];
	dim[2] = (1 << maxLevel) * lbSize.z * rootDim[2];

	// Get timestep for given field
	const BCMFileIO::IdxStep *step = loader.GetStep(fieldName);

	const std::list<unsigned int> *stepList = step->GetStepList();
	// printf("dbg: # of steps = %d\n", stepList->size());

	if (timeStepIndex >= stepList->size()) {
		fprintf(stderr, "[HDMloader] Given time step index %d exceeds the maximum time step in the file %d.\n", timeStepIndex, (int)stepList->size());
		return false;
	}

	int vc = virtualCells;

	int id_cid = 0;
	int id_s32 = 0;
	int id_s64 = 0;
	int id_v32[3] = {0}; // 0:u, 1:v, 2:w
	int id_v64[3] = {0}; // 0:u, 1:v, 2:w

	loader.LoadLeafBlock(&id_cid, "CellID", vc);

	// Prepare SparseVolume
	m_sparseVolume.Create(dim[0], dim[1], dim[2], components);

	std::list<unsigned int>::const_iterator it = stepList->begin();

	// Move to specified time step.
	for (int i = 0; i < timeStepIndex; i++) {
		it++;
	}

	{

		if (type == TYPE_FLOAT32)
		{

			if (components == 1)
			{
				loader.LoadLeafBlock(&id_s32, fieldName, vc, *it);
				ConvertLeafBlockScalar<float>(m_sparseVolume, id_s32, maxLevel,
											  rootDim, globalOrigin,
											  globalRegion);
			}
			else
			{
				loader.LoadLeafBlock(id_v32, fieldName, vc, *it);
				ConvertLeafBlockVector<float>(m_sparseVolume, id_v32, maxLevel,
											  rootDim, globalOrigin,
											  globalRegion);
			}
		}
		else if (type == TYPE_FLOAT64)
		{
			if (components == 1)
			{
				loader.LoadLeafBlock(&id_s64, fieldName, vc, *it);
				ConvertLeafBlockScalar<double>(m_sparseVolume, id_s64, maxLevel,
											   rootDim, globalOrigin,
											   globalRegion);
			}
			else
			{
				loader.LoadLeafBlock(id_v64, fieldName, vc, *it);
				ConvertLeafBlockVector<double>(m_sparseVolume, id_v64, maxLevel,
											   rootDim, globalOrigin,
											   globalRegion);
			}
		}
	}

	// @note { Must call `Build` here to build spacial data structure for sparse
	// volume(to use `Sample` meethod in later phase. }
	m_sparseVolume.Build();

	return true;
}

/**
 * HDMWidth取得
 * @retval int HDMWidth
 */
int HDMLoader::Width() { return m_sparseVolume.Width(); }

/**
 * HDMHeight取得
 * @retval int HDMHeight
 */
int HDMLoader::Height() { return m_sparseVolume.Height(); }

/**
 * HDMDepth取得
 * @retval int HDMDepth
 */
int HDMLoader::Depth() { return m_sparseVolume.Depth(); }

/**
 * HDMComponent取得
 * @retval int Component数
 */
int HDMLoader::Component() { return m_sparseVolume.Component(); }

/**
 * SparseVolumeData取得
 * @retval SparseVolumeData* SparseVolumeDataアドレス
 */
BufferSparseVolumeData *HDMLoader::SparseVolumeData()
{
	return &m_sparseVolume;
}
