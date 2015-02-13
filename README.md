# HIVE

## Requirements

* cmake 2.8 or later
* HDF5

## git clone

    $ git clone https://github.com/avr-aics-riken/HIVE.git
    $ git submodule udate --init
	
## Setup

Build third party libraries.

### Linux

#### CentOS 6

Assume cmake2.8 and hdf5 has been installed somewhere.

    $ CMAKE_BIN=/path/to/cmake28 ./scripts/build_loader_libs_linux-x64.sh

#### Ubuntu 14.04

    $ sudo apt-get install libhdf5-dev
    $ ./scripts/build_loader_libs_linux-x64.sh

### MacOSX

    $ ./scripts/build_loader_libs_macosx.sh


## How to build

    $ cd HIVE
    $ mkdir build
    $ cd build
    $ cmake ../
    $ make


