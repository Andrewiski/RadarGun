window.onload = init;
var iosocket; 
var oldssid; 
function init(){ 
  /***/  
    iosocket= io();  
    var selector = document.getElementById('ssid');
    var lanInfo = document.getElementById('lanInfo');
    var waitimg = document.getElementById('wait');
    iosocket.on('ssidList', function(message) {
        if(selector.options[ selector.selectedIndex ].value != "note"){
            var reserveOption = selector.options[ selector.selectedIndex ];
            selector.options.length = 0;
            selector.appendChild(reserveOption);
        }
        //selector.options.length = 1; 
        for(var serviceName in message) {
            var length=selector.options.length;
            var seen = false;
            for ( var i=0; i <= length - 1; i++ ) {
                if (selector.options[i].text.indexOf(message[serviceName].ssid) != -1)  {
                    seen = true;
                    break;
                    }
            }
            if (!seen) {
                var option = document.createElement('option');
                option.text = message[serviceName].ssid +" " + message[serviceName].strength;
                option.value = message[serviceName].ssid;
                selector.appendChild(option);
            }
        }
    });
    iosocket.on('lan_info', function(message) {
        if(message !=null ){
            oldssid = message.ssid;
            lanInfo.innerHTML = "SSID: "+message.ssid + "&nbsp; &nbsp; &nbsp; &nbsp;"+"IP : "+message.ip4Address;
            lanInfo.style.display="";
            lanInfo.style.color = "#FFFFFF"; 
            document.forms["done"].style.display="";
        }
    });
    iosocket.on('wifiResult', function(message) {
        //alert(message);
        waitimg.style.display="none";
        if(message == "ready")
        {
            
        }
        if(message == "failure")
        {
            lanInfo.innerHTML = "OOPS, Maybe there is something wrong with the network.You should try again!";
            lanInfo.style.display="";
            lanInfo.style.color = "red"; 
            document.forms["done"].style.display="none";
            document.forms["wifi_info"].style.display="";            
        }
    });

    iosocket.emit("scanWifi","a");
    
    //never submit this form,
    document.forms["wifi_info"].onsubmit = function(e) {  
        return false;
    }  
}
function select_click(){
    
}
function check(){
    var waitimg = document.getElementById('wait');
    var obj = {}
    obj.ssid = document.forms["wifi_info"]["ssid"].value;                           
    if(obj.ssid == 'note')
    {
        alert("Please,choose the ssid");
        return false;
    }

    obj.password = document.forms["wifi_info"]["password"].value;
    if(obj.password == null || obj.password == "")
    {
        alert("Please,Enter the ssid password.");
        return false;
    }
    if(obj.ssid == oldssid){
        alert("Sorry, connected!");
        return false;
    }
    obj.admin = document.forms["wifi_info"]["admin"].value;

    iosocket.emit("configWifi",obj);
    document.forms["wifi_info"].style.display="none";  
    waitimg.style.display="";
    return true;
}
