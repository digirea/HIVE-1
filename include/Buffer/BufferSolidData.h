/**
 * @file BufferSolidData.h
 * BufferSolidDataクラス
 */
#ifndef _BUFFERSOLIDDATA_H_
#define _BUFFERSOLIDDATA_H_

#include "Ref.h"
#include "BufferData.h"

class Vec3Buffer;
class Vec2Buffer;
class FloatBuffer;
class UintBuffer;

/**
 * BufferSolidDataクラス
 */
class BufferSolidData : public BufferData
{
private:
    class Impl;
    Impl* m_imp;

protected:
    BufferSolidData(BufferSolidData* inst);
    BufferSolidData();
    ~BufferSolidData();
    
public:
		typedef enum {
				SOLID_TETRA	= 4,	 // @todo { Move BufferTetra to BufferSolid }
				SOLID_PYRAMID	= 5,	
				SOLID_PRISM	= 6,	
				SOLID_HEXAHEDRON	= 8,	
		} SolidType;

    static BufferSolidData* CreateInstance();

    void Create(SolidType type, int vertexnum, int indexnum);
    void Clear();
    void print();
    Vec3Buffer*  Position() ;
    UintBuffer*  Index()    ;
    Vec3Buffer*  Position() const;
    UintBuffer*  Index()    const;
		SolidType    Type() const;

};

#endif //_BUFFERSOLIDDATA_H_

