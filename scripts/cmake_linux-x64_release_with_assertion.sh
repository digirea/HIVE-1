#!/bin/sh

# Assume mpicc has been installed

CXX=mpicxx CC=mpicc cmake -H. -Bbuild -DLUA_USE_READLINE=Off -DLUA_USE_CURSES=Off -DHIVE_BUILD_WITH_MPI=On -DHIVE_BUILD_WITH_OPENMP=On -DHIVE_BUILD_WITH_CDMLIB=Off -DHIVE_BUILD_WITH_HDMLIB=Off -DHIVE_BUILD_WITH_PDMLIB=Off -DBUILD_SHARED_LIBS=On -DHIVE_BUILD_WITH_OPENGL=Off -DCMAKE_C_FLAGS="-O1 -g -fno-omit-frame-pointer -UNDEBUG" -DCMAKE_CXX_FLAGS="-O1 -g -fno-omit-frame-pointer -UNDEBUG" -DCMAKE_BUILD_TYPE=Debug
