#!/bin/bash

## Define package name
PKG_NAME='ffmpeg'

## Define system local path
LOCAL_PATH='/usr/local'

## Define system library path
LIB_PATH='/usr/lib'

## Define system binary path
BIN_PATH='/usr/bin'

## Define user home dir
USER_HOME_DIR=$(getent passwd ${SUDO_USER:-$USER} | cut -d: -f6)

## Define repository name
REPO_NAME='BtbN/FFmpeg-Builds'

## Define URL releases
RELEASES_URL="https://api.github.com/repos/${REPO_NAME}/releases"

## Define URL of the latest release
## LR_URL="https://api.github.com/repos/${REPO_NAME}/releases/latest"
LR_URL="${RELEASES_URL}/latest"

## Define temporal directory
TMP_DIR='tmp'

## Move to the temporal directory
tmp_path="${USER_HOME_DIR}/${TMP_DIR}"
mkdir -vp $tmp_path
cd $tmp_path

## Get the latest version and build
full_version=$(curl -s "${LR_URL}" \
| grep -m 1 ffmpeg-n \
| cut -d ':' -f2 \
| cut -d '-' -f2 \
| tr -d 'n')

version="${full_version::-2}"
build="${full_version:4:1}"

echo  'Latest version: '$full_version

## Get the filename
dl_filename=$(curl -s "${LR_URL}" \
| grep "name.*linux64-gpl-${version}.tar.xz" \
| cut -d ':' -f2 \
| { read n; echo ${n:1:-2}; })

dl_name="${dl_filename::-7}"

echo 'File to download: '$dl_filename

## Download the latest
## Base on: echo $(curl -s "${LR_URL}"" | grep "browser_download_url.*ffmpeg-n4\.4\.1.*linux64-gpl-4\.4\.tar.xz" | cut -d ':' -f 2,3 | tr -d '"')
curl -s "${LR_URL}" \
| grep "browser_download_url.*linux64-gpl-${version}.tar.xz" \
| cut -d ':' -f 2,3 \
| tr -d '"' \
| wget -qi - -O $dl_filename

## Remove previous package installed using apt
status="$(dpkg-query -W --showformat='${db:Status-Status}' ${PKG_NAME} 2>&1)"
if [ $? = 0 ] || [ "${status}" = installed ]; then
  sudo apt remove --purge --auto-remove -y "${PKG_NAME}"
fi

## Define package installation paths
pkg_path="${LOCAL_PATH}/${PKG_NAME}"
pkg_lib_path="${LIB_PATH}/${PKG_NAME}"

## Extract and install the downloaded version
sudo rm -rf $pkg_path && tar -xvf $dl_filename
sudo mv -v $dl_name $pkg_path

## Add binary files to system binary and library directories
sudo ln -sv "${pkg_path}" "${pkg_lib_path}"
sudo ln -sv "${pkg_lib_path}/bin/ffmpeg" "${BIN_PATH}/ffmpeg"
sudo ln -sv "${pkg_lib_path}/bin/ffplay" "${BIN_PATH}/ffplay"
sudo ln -sv "${pkg_lib_path}/bin/ffprobe" "${BIN_PATH}/ffprobe"

## Test your new version.
ffmpeg -version | grep 'ffmpeg version'