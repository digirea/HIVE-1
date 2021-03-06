/**
 * @file VolumeAnalyzer_Lua.h
 * VolumeAnalyzer Luaラッパー
 */
#ifndef _VOLUMEANALYZER_LUA_H_
#define _VOLUMEANALYZER_LUA_H_

#include <vector>
#include "LuaUtil.h"
#include "Analyzer.h"
#include "VolumeAnalyzer.h"
#include "BufferVolumeData_Lua.h"

/**
 * VolumeAnalyzer Luaラッパー
 */
class VolumeAnalyzer_Lua : public VolumeAnalyzer
{
public:
    VolumeAnalyzer_Lua() {}
    ~VolumeAnalyzer_Lua() {}
    double MinX() {
        return VolumeAnalyzer::MinX();
    }

    double MinY() {
        return VolumeAnalyzer::MinY();
    }

    double MinZ() {
        return VolumeAnalyzer::MinZ();
    }

    double MaxX() {
        return VolumeAnalyzer::MaxX();
    }

    double MaxY() {
        return VolumeAnalyzer::MaxY();
    }

    double MaxZ() {
        return VolumeAnalyzer::MaxZ();
    }

    bool Execute(BufferVolumeData_Lua *vol) {
        return VolumeAnalyzer::Execute(vol);
    }
    
    LuaTable GetHistgram() {
        const std::vector<float>& histgram = VolumeAnalyzer::GetHistgram();
        LuaTable t;
        for (int i = 0, size = static_cast<int>(histgram.size()); i < size; ++i) {
            t.push(histgram[i]);
        }
        return t;
    }
    
    LuaTable GetHistgramInRange(BufferVolumeData_Lua *vol, double min, double max) {
        const std::vector<float> histgram = VolumeAnalyzer::GetHistgramInRange(vol, min, max);
        LuaTable t;
        for (int i = 0, size = static_cast<int>(histgram.size()); i < size; ++i) {
            t.push(histgram[i]);
        }
        return t;
    }

    LUA_SCRIPTCLASS_BEGIN(VolumeAnalyzer_Lua)
    LUA_SCRIPTCLASS_METHOD_ARG0(double, MinX)
    LUA_SCRIPTCLASS_METHOD_ARG0(double, MinY)
    LUA_SCRIPTCLASS_METHOD_ARG0(double, MinZ)
    LUA_SCRIPTCLASS_METHOD_ARG0(double, MaxX)
    LUA_SCRIPTCLASS_METHOD_ARG0(double, MaxY)
    LUA_SCRIPTCLASS_METHOD_ARG0(double, MaxZ)
    LUA_SCRIPTCLASS_METHOD_MEASURE_CALC_ARG1("VolumeAnalyzer", bool, Execute, BufferVolumeData_Lua*)
    LUA_SCRIPTCLASS_METHOD_ARG0(LuaTable, GetHistgram);
    LUA_SCRIPTCLASS_METHOD_ARG3(LuaTable, GetHistgramInRange, BufferVolumeData_Lua*, double, double);
    LUA_SCRIPTCLASS_END();

};
LUA_SCRIPTCLASS_CAST_AND_PUSH(VolumeAnalyzer_Lua);


#endif //_VOLUMEANALYZER_LUA_H_

