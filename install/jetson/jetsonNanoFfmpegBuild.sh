#!/bin/bash
#https://github.com/jocover/jetson-ffmpeg 
#used to enable hardware encoding on jetson Nano

sudo apt-get update -qq && sudo apt-get -y install autoconf automake build-essential cmake git-core libass-dev libfreetype6-dev libgnutls28-dev libsdl2-dev libtool libva-dev libvdpau-dev libvorbis-dev libxcb1-dev libxcb-shm0-dev libxcb-xfixes0-dev pkg-config texinfo wget yasm zlib1g-dev libunistring-dev libdrm-dev libopus-dev libvpx-dev libwebp-dev libx264-dev libx265-dev libxml2-dev libfdk-aac-dev libmp3lame-dev libv4l-dev

git clone https://github.com/jocover/jetson-ffmpeg.git
cd jetson-ffmpeg
mkdir build
cd build
cmake ..
make
sudo make install
sudo ldconfig


git clone git://source.ffmpeg.org/ffmpeg.git -b release/4.2 --depth=1
cd ffmpeg
wget https://github.com/jocover/jetson-ffmpeg/raw/master/ffmpeg_nvmpi.patch
git apply ffmpeg_nvmpi.patch
./configure --enable-nvmpi \
    --enable-gpl \
    --enable-nonfree \
    --arch=aarch64 \
    --enable-libass \
    --enable-libfdk-aac \
    --enable-libfreetype \
    --enable-libmp3lame \
    --enable-libopus \
    --enable-libvorbis \
    --enable-libvpx \
    --enable-libx264 \
    --enable-libx265 \
    --enable-libxml2 \
    --enable-libwebp \
    --enable-libdrm \
    --enable-libv4l2

make -j4

sudo apt-get remove ffmpeg

sudo make install
