#!/bin/bash

# <<Setup>>
#
# Ubuntu 14.04:
# $ sudo apt-get install libhdf5-dev
#
# CentOS 6:
# $ sudo yum install epel-release
# $ sudo yum install hdf5-devel
# $ sudo yum install cmake28
# 

topdir=`pwd`
installdir=`pwd`/third_party/local

if [ -z "${CMAKE_BIN+x}" ]; then
  CMAKE_BIN=cmake
fi

if [ -z "${CC+x}" ]; then
  c_compiler=mpicc
  CC=mpicc
else
  c_compiler=${CC}
fi

if [ -z "${CXX+x}" ]; then
  cxx_compiler=mpicxx
  CXX=mpicxx
else
  cxx_compiler=${CXX}
fi

echo "C compiler  : " ${CC}
echo "CXX compiler: " ${CXX}

function clean_install_dir {
	rm -rf ${installdir}
}

function build_tp {
	#
	# TextParser
	#
	cd third_party/ 
	cd TextParser/
	if [ -f "Makefile" ]; then
		make distclean
	fi

	# Assume CXX and CC is set to use MPI compiler.
	autoreconf -ivf
	CXX=${cxx_compiler} CC=${c_compiler} ./configure --prefix=${installdir}/TextParser && make && make install
	if [[ $? != 0 ]]; then exit $?; fi
	cd ${topdir}
}

function build_cdmlib {
	#
	# CDMlib
	#
	cd third_party/
	cd CDMlib/
	if [ -f "Makefile" ]; then
		make distclean
	fi
	autoreconf -ivf
	CXX=${cxx_compiler} CC=${c_compiler} ./configure --prefix=${installdir}/CDMlib --with-parser=${installdir}/TextParser --with-MPI=yes && make && make install
	if [[ $? != 0 ]]; then exit $?; fi
	cd ${topdir}
}

function build_polylib {
	#
	# Polylib
	#
	cd third_party/
	cd Polylib/
	if [ -f "Makefile" ]; then
		make distclean
	fi
	autoreconf -ivf
	CXX=${cxx_compiler} CC=${c_compiler} ./configure --prefix=${installdir}/Polylib --with-parser=${installdir}/TextParser && make && make install
	if [[ $? != 0 ]]; then exit $?; fi
	cd ${topdir}
}
 
function build_bcmtools {
	#
	# BCMTools
	#
	cd third_party/
	cd BCMTools/
	if [ -f "Makefile" ]; then
		make distclean
	fi
	autoreconf -ivf
	CXX=${cxx_compiler} CC=${c_compiler} ./configure --prefix=${installdir}/BCMTools --with-parser=${installdir}/TextParser --with-polylib=${installdir}/Polylib && make && make install
	if [[ $? != 0 ]]; then exit $?; fi
	cd ${topdir}
}

function build_hdmlib {
	#
	# HDMlib
	#
	cd third_party/
	cd HDMlib/
	if [ -f "Makefile" ]; then
		make distclean
	fi
	autoreconf -ivf
	CXX=${cxx_compiler} CC=${c_compiler} ./configure --prefix=${installdir}/HDMlib --with-parser=${installdir}/TextParser --with-bcm=${installdir}/BCMTools && make && make install
	if [[ $? != 0 ]]; then exit $?; fi
	cd ${topdir}
}

function build_pdmlib {
	cd third_party/
	rm -rf fpzip-1.0.1/
	tar -zxvf fpzip-1.0.1.tar.gz
	cd fpzip-1.0.1/src
	# TODO: Provide our own Makefile
	make
	cd ..
	mkdir -p ${installdir}/include
	mkdir -p ${installdir}/lib
	cp -Rf inc/* ${installdir}/include/
	cp -Rf lib/* ${installdir}/lib/
	cd ${topdir}

	cd third_party/
	rm -rf Zoltan_v3.81/
	rm -rf Zoltan_build/
	tar -zxvf zoltan_distrib_v3.81.tar.gz
	mkdir Zoltan_build
	cd Zoltan_build
	CXX=${cxx_compiler} CC=${c_compiler} ../Zoltan_v3.81/configure --prefix=${installdir} && make && make install
	if [[ $? != 0 ]]; then exit $?; fi
	cd ${topdir}

	#
	# PDMlib
	#
	cd third_party/
	rm -rf PDMlib_build
	mkdir PDMlib_build
	cd PDMlib_build/
	CXX=${cxx_compiler} CC=${c_compiler} ${CMAKE_BIN} -DTP_ROOT=${installdir}/TextParser -DFPZIP_ROOT=${installdir} -DZOLTAN_ROOT=${installdir} -DCMAKE_INSTALL_PREFIX=${installdir}/PDMlib ../PDMlib && make && make install
	if [[ $? != 0 ]]; then exit $?; fi
	cd ${topdir}
}

function build_udmlib {
	cd third_party/
	rm -rf cgnslib_3.2.1/
	rm -rf cgnslib_build/
	tar -zxvf cgnslib_3.2.1.tar.gz
	mkdir cgnslib_build
	cd cgnslib_build
	CXX=${cxx_compiler} CC=${c_compiler} ${CMAKE_BIN} -DCMAKE_INSTALL_PREFIX=${installdir} ../cgnslib_3.2.1 && make && make install

	#
	# UDMlib
	#
	cd third_party/UDMlib
	if [ -f "Makefile" ]; then
		make distclean
	fi
	autoreconf -ivf
	# Work around: Use cxx compiler even for CC to compile example programs.
	CXX=${cxx_compiler} CC=${cxx_compiler} ./configure --prefix=${installdir}/UDMlib --with-ompi --with-tp=${installdir}/TextParser --with-zoltan=${installdir} --with-cgns=${installdir} && make && make install
	if [[ $? != 0 ]]; then exit $?; fi
	cd ${topdir}
}

function build_compositor {

	cd third_party/ 
	cd 234Compositor/
	if [ -f "Makefile" ]; then
		make distclean
	fi

	autoreconf -ivf
	CXX=${cxx_compiler} CC=${c_compiler} ./configure --prefix=${installdir}/234Compositor && make && make install
	if [[ $? != 0 ]]; then exit $?; fi
	cd ${topdir}
}


clean_install_dir
build_tp
build_cdmlib
build_polylib
build_bcmtools
build_hdmlib
build_pdmlib
build_udmlib
build_compositor
