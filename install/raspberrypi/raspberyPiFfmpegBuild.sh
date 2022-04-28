#!/bin/bash
#https://www.willusher.io/general/2020/11/15/hw-accel-encoding-rpi4 

sudo apt-get update -qq && sudo apt-get -y install autoconf automake build-essential cmake git-core libaom-dev libass-dev libfreetype6-dev libgnutls28-dev libsdl2-dev libtool libva-dev libvdpau-dev libvorbis-dev libxcb1-dev libxcb-shm0-dev libxcb-xfixes0-dev pkg-config texinfo wget yasm zlib1g-dev libunistring-dev libdrm-dev libopus-dev libvpx-dev libwebp-dev libx264-dev libx265-dev libxml2-dev libfdk-aac-dev libmp3lame-dev

echo This Will Fail on 1GB Memory version of Raspberry PI 4 Use "top" to check ram size   

echo Downloading from Git hub https://github.com/FFmpeg/FFmpeg.git
cd ~
git clone --depth 1 --branch release/4.3 https://github.com/FFmpeg/FFmpeg.git
cd FFmpeg

./configure  \
    --enable-gpl \
    --enable-nonfree \
    --arch=aarch64 \
    --enable-libaom \
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
    --enable-libdrm

   make -j4
   make install