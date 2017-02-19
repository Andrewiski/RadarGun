/*
 *
 *   Copyright (C) 2016 by seeedstudio
 *   Author: Baozhu Zuo (zuobaozhu@gmail.com)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 *   
 */

var child_process = require('child_process');
var async = require('async');
var fs = require("fs");

/**
 * The **hostpad** command is used to configure wireless access points.
 *
 * @static
 * @category hostapd
 *
 */
var hostapd = module.exports = {
  exec: child_process.exec,
  disable: disable,
  enable: enable
};

/**
 * The **hostpad disable** command is used to stop hosting an access point
 * on a specific wireless interface.
 *
 * @static
 * @category hostapd
 * @param {string} interface The network interface of the access point.
 * @param {function} callback The callback function.
 * @returns {process} The child process.
 * @example
 *
 * var hostapd = require('hostapd');
 *
 * hostapd.disable('wlan0', function(err) {
 *   // no longer hosting the access point
 * });
 *
 */
function disable(interface, callback) {
  var file = interface + '-hostapd.conf';

  return this.exec('kill `pgrep -f "^hostapd -B ' + file + '"` || true',
    callback);
}

/**
 * The **hostpad enable** command is used to host an access point
 * on a specific wireless interface.
 *
 * @static
 * @category hostapd
 * @param {object} options The access point configuration.
 * @param {function} callback The callback function.
 * @returns {process} The child process.
 * @example
 *
 * var hostapd = require('hostapd');
 *
 * var options = {
 *      interface: SoftAp0
 *      driver: nl80211
 *      ssid: SitaraAP
 *      country_code: US
 *      hw_mode: 'g',
 *      wpa: 2
 *      wpa_passphrase: BeagleBone  
 *      logger_syslog: -1
 *      logger_syslog_level: 2
 *      logger_stdout: -1
 *      logger_stdout_level: 2
 *      ieee80211d: 1
 *      ieee80211h: 1
 *      ap_channel_sync: 1   
 *      beacon_int: 100
 *      dtim_period: 2
 *      max_num_sta: 10
 *      supported_rates: 10 20 55 110 60 90 120 180 240 360 480 540
 *      basic_rates: 10 20 55 110 60 120 240 
 *      preamble: 1
 *      macaddr_acl: 0
 *      auth_algs: 3
 *      ignore_broadcast_ssid: 0
 *      tx_queue_data3_aifs: 7
 *      tx_queue_data3_cwmin: 15
 *      tx_queue_data3_cwmax: 1023
 *      tx_queue_data3_burst: 0
 *      tx_queue_data2_aifs: 3
 *      tx_queue_data2_cwmin: 15
 *      tx_queue_data2_cwmax: 63
 *      tx_queue_data2_burst: 0
 *      tx_queue_data1_aifs: 1
 *      tx_queue_data1_cwmin: 7
 *      tx_queue_data1_cwmax: 15
 *      tx_queue_data1_burst: 3.0
 *      tx_queue_data0_aifs: 1
 *      tx_queue_data0_cwmin: 3
 *      tx_queue_data0_cwmax: 7
 *      tx_queue_data0_burst: 1.5
 *      wme_enabled: 1
 *      uapsd_advertisement_enabled: 1
 *      wme_ac_bk_cwmin: 4
 *      wme_ac_bk_cwmax: 10
 *      wme_ac_bk_aifs: 7
 *      wme_ac_bk_txop_limit: 0
 *      wme_ac_bk_acm: 0
 *      wme_ac_be_aifs: 3
 *      wme_ac_be_cwmin: 4
 *      wme_ac_be_cwmax: 10
 *      wme_ac_be_txop_limit: 0
 *      wme_ac_be_acm: 0
 *      wme_ac_vi_aifs: 2
 *      wme_ac_vi_cwmin: 3
 *      wme_ac_vi_cwmax: 4
 *      wme_ac_vi_txop_limit: 94
 *      wme_ac_vi_acm: 0
 *      wme_ac_vo_aifs: 2
 *      wme_ac_vo_cwmin: 2
 *      wme_ac_vo_cwmax: 3
 *      wme_ac_vo_txop_limit: 47
 *      wme_ac_vo_acm: 0
 *      ap_max_inactivity: 10000
 *      disassoc_low_ack: 1
 *      ieee80211n: 1
 *      ht_capab: [SHORT-GI-20][GF]
 *      wep_rekey_period: 0
 *      eap_server: 1
 *      own_ip_addr: 127.0.0.1
 *      wpa_group_rekey: 0
 *      wpa_gmk_rekey: 0
 *      wpa_ptk_rekey: 0
 *      ap_table_max_size: 255
 *      ap_table_expiration_time: 60
 *      wps_state: 2
 *      ap_setup_locked: 1
 *      uuid: 12345678-9abc-def0-1234-56789abcdef0
 *      device_name: Sitara
 *      manufacturer: TexasInstruments
 *      model_name: TI_Connectivity_module
 *      model_number: wl18xx
 *      serial_number: 12345
 *      device_type: 0-00000000-0
 *      config_methods: virtual_display virtual_push_button keypad
 * };
 *
 * hostapd.enable(options, function(err) {
 *   // the access point was created
 * });
 *
 */
function enable(options, callback) {
  var file = options.interface + '-hostapd.conf';

  var commands = [
 //   'cat <<EOF >' + file + ' && hostapd -B ' + file 
    'cat <<EOF >' + file + ' && hostapd -B ' + file + ' && rm -f ' + file
  ];

  Object.getOwnPropertyNames(options).forEach(function(key) {
    commands.push(key + '=' + options[key]);
  });
    console.log("hostapd start");
    hostapd_log = child_process.exec(commands.join('\n'));
    hostapd_log.stdout.on('data', function (data) {
        console.log(data); 
    });
  // async.series([
    // function(next) {
        // console.log("add SoftAp0");
        // fs.stat('/sys/class/net/SoftAp0', function(err, stat) {
            // console.log(err);
            // if(err) {
                // child_process.exec("iw phy `ls /sys/class/ieee80211/` interface add SoftAp0 type managed",next);
            // }
            // next();
        // });
    // },
    // function(next) {
        // console.log("ifconfig SoftAp0 up");
        // child_process.exec("ifconfig SoftAp0 up",next);
        // next();
    // },
    // function(next) {
        // console.log("hostapd start");
        // hostapd_log = child_process.exec(commands.join('\n'),next);
        // hostapd_log.stdout.on('data', function (data) {
            // console.log(data); 
        // });
    // },
    // function(next) {
        // console.log("config addr");
        // child_process.exec("ifconfig SoftAp0 192.168.8.1 netmask 255.255.255.0 up",next);
    // },
    // function(next) {
        // console.log("start udhcpd");
        // last = child_process.exec('pgrep -f udhcpd.conf',function(err) {
        // });

        // last.stdout.on('data', function (data) {
            // console.log(data); 
            // if(data == null){
                // child_process.exec("udhcpd "+__dirname+"/../conf/udhcpd.conf");
            // }
        // });
    // },
  // ],function(err) {
      // callback(err);
    // console.log("hostapd start: ",err || '');
    // });
}