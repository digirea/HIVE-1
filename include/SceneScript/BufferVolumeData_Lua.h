/**
 * @file BufferVolumeData_Lua.h
 * BufferVolumeData Luaラッパー
 */
#ifndef _BUFFERVOLUMEDATA_LUA_H_
#define _BUFFERVOLUMEDATA_LUA_H_

#include "BufferVolumeData.h"
/**
 * BufferVolumeData Luaラッパー
 */
class BufferVolumeData_Lua : public BufferVolumeData
{
public:
    BufferVolumeData_Lua(BufferVolumeData* vol) : BufferVolumeData(vol) { }
    BufferVolumeData_Lua() {}
    ~BufferVolumeData_Lua() {}
    
public:
    static BufferVolumeData_Lua* CreateInstance(BufferVolumeData* bufferVolumeData = 0);
    LUA_SCRIPTCLASS_BEGIN(BufferVolumeData_Lua)
    LUA_SCRIPTCLASS_END();
};
LUA_SCRIPTCLASS_CAST_AND_PUSH(BufferVolumeData_Lua);


#ifdef CPP_IMPL_INSTANCE

BufferVolumeData_Lua* BufferVolumeData_Lua::CreateInstance(BufferVolumeData* bufferVolumeData)
{
    if (bufferVolumeData) {
        return new BufferVolumeData_Lua(bufferVolumeData);
    } else {
        return new BufferVolumeData_Lua();
    }
}

#endif


#endif //_BUFFERVOLUMEDATA_LUA_H_

