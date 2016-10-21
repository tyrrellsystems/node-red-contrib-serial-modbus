/**
 * Copyright 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
  "use strict";
  var modbus = require('modbus-serial');
  var bluebird = require('bluebird');
  var util = require('util');
  var events = require("events");

  var settings = RED.settings;

  var ports = {};

  function config(n){
    RED.nodes.createNode(this,n);
    this.port = n.port;
    this.baud = parseInt(n.baud);
    this.data = parseInt(n.data);
    this.parity = n.parity;
    this.stop = parseInt(n.stop);

    this.requests = [];

    //events.EventEmitter.call(this);

    if (ports[this.port]) {
      //error
    } else {
      ports[this.port] = this;
    }

    var node = this;

    this.connected = false;

    this.client = new modbus();
    this.client.setTimeout(1000);
    try {
      this.client.connectRTUBuffered(node.port, {
        baudRate: node.baud, 
        dataBits: node.data, 
        parity: node.parity, 
        stopBits: node.stop
      },
      function() {
        node.emit('connected');
        node.connected = true;
      });
    } catch (err) {
      console.log("foo - " + err);
    }

    node.processing = false;

    function processList() {
      node.processing = true;
      if (node.requests.length != 0) {
        var obj = node.requests.pop();
        var promise;
        switch(obj.type) {
          case 'readCoils':
            node.client.setID(obj.id);
            promise = node.client.readCoils(obj.offset, obj.length);
          break;
          case 'readDiscreteInputs':
            node.client.setID(obj.id);
            promise = node.client.readDiscreteInputs(obj.offset, obj.length);
          break;
          case 'readInputRegisters':
            node.client.setID(obj.id);
            promise = node.client.readInputRegisters(obj.offset, obj.length);
          break;
          case 'readHoldingRegisters':
            node.client.setID(obj.id);
            promise =  node.client.readHoldingRegisters(obj.offset, obj.length);
          break;
          case 'writeCoils':
            node.client.setID(obj.id);
            promise = node.client.writeCoils(obj.offset, obj.data);
          break;
          case 'writeInputRegisters':
            //console.log("writing regs: ", obj);
            node.client.setID(obj.id);
            promise = node.client.writeRegisters(obj.offset, obj.data);            
          break;
        }

        if (promise) {
          promise
          .catch(function (err){
            node.log("Error: " + err);
          })
          .then(function (data){
            if (obj.callback) {
              obj.callback(data);
            } else {
              node.log("no callback");
            }
          }).then(function (){
            processList();
          });
        } else {
          processList();
        }
      } else {
        node.processing = false;
      }
    }


    this.readCoils = function(id, offset, length, callback) {
      var obj = {
        id: id,
        type: 'readCoils',
        offset: offset,
        length: length,
        callback: callback
      };
      node.requests.push(obj);
      if (!node.processing) {
        processList();
      }
    };

    this.readDiscreteInputs = function(id, offset, length, callback) {
      var obj = {
        id: id,
        type: 'readDiscreteInputs',
        offset: offset,
        length: length,
        callback: callback
      };
      node.requests.push(obj);
      if (!node.processing) {
        processList();
      }
    };

    this.readInputRegisters = function(id, offset, length, callback) {
      var obj = {
        id: id,
        type: 'readInputRegisters',
        offset: offset,
        length: length,
        callback: callback
      };
      node.requests.push(obj);
      if (!node.processing) {
        processList();
      }
    };

    this.readHoldingRegisters = function(id, offset, length, callback) {
      var obj = {
        id: id,
        type: 'readHoldingRegisters',
        offset: offset,
        length: length,
        callback: callback
      };
      node.requests.push(obj);
      if (!node.processing) {
        processList();
      }
    };

    this.writeCoils = function(id,offset,data) {
      var obj = {
        id: id,
        type: 'writeCoils',
        data: data,
        offset: offset
      };
      node.requests.push(obj);
      if (!node.processing) {
        processList();
      }
      //node.client.setID(id);
      //node.client.writeCoils(offset, data);
    };

    this.writeDiscreteInputs = function (id,offset,data) {
      this.writeCoils(id,offset,data);
    };

    this.writeInputRegisters = function(id,offset,data) {
      var obj = {
        id: id,
        type: 'writeInputRegisters',
        data: data,
        offset: offset
      };
      node.requests.push(obj);
      if (!node.processing) {
        processList();
      }
      // node.client.setID(id);
      // node.client.writeRegisters(offset,data);
    };

    this.writeHoldingRegisters = function(id,offset,data) {
      this.writeInputRegisters(id,offset,data);
    };

    this.on('close',function(done){
      if(ports[node.port]) {
        delete ports[node.port];
        node.client.close(done);
      }
    });

  };  

  //util.inherits(config, events.EventEmitter);

  RED.nodes.registerType('modbusSerialConfig', config);


  function read(n) {
    RED.nodes.createNode(this,n);
    this.port = n.port;

    this.connection = RED.nodes.getNode(this.port);

    //this.device = n.device;

    this.slaves = n.slaves;
    this.start = n.start;
    this.count =  n.count;
    this.dtype = n.dtype;

    this.period = n.period;

    this.topic = n.topic;

    var node = this;

    if (node.connection.connected) {
      node.status({fill:"green", shape: "dot", text:"connected"});
      node.interval = setInterval(poll, (1000 * node.period));
      poll();
    } else {
      node.connection.on('connected',function(){
        node.status({fill:"green", shape: "dot", text:"connected"});
        node.interval = setInterval(poll, (1000 * node.period));
        poll();
      });
    }

    function poll() {
      var slaves = [];
      if (node.slaves.indexOf(',')) {
        slaves = node.slaves.split(',');
      } else {
        slaves.push(node.slaves);
      }

      function callback(data) {
        var topic = node.topic;
        if (topic.lastIndexOf('/') != topic.length) {
          topic += '/'
        }
        var msg = {
          topic: topic + slave,
          payload: data.buffer
        };
        node.send(msg);
      }

      for (var i=0; i<slaves.length; i++) {
        var slave = slaves[i];
        if (node.dtype === 'discrete') {
          node.connection.readDiscreteInputs(slave,node.start, node.count,callback);
        } else if (node.dtype === 'coil') {
          node.connection.readCoils(slave,node.start, node.count,callback);
        } else if (node.dtype === 'input') {
          node.connection.readInputRegisters(slave,node.start, node.count,callback)
        } else if (node.dtype === 'holding') {
          node.connection.readHoldingRegisters(slave,node.start, node.count,callback);
        }

      }
    }

    node.on('close', function(){
      clearInterval(node.interval);
    });
  }

  RED.nodes.registerType('modbusSerial in', read);

  function write(n) {
    RED.nodes.createNode(this,n);
    this.port = n.port;

    this.device = n.slave;
    this.start = n.start;
    this.dtype = n.dtype;

    this.connection = RED.nodes.getNode(this.port);

    var node = this;

    if (node.connection.connected) {
      node.status({fill:"green", shape: "dot", text:"connected"});
    } else {
      node.connection.on('connected',function(){
        node.status({fill:"green", shape: "dot", text:"connected"});
      });
    }

    node.on('input',function(msg) {

      var slave = node.device;
      if (!slave && msg.topic) {
        if (msg.topic.IndexOf('/') != -1) {
          var part = msg.topic.substring(msg.topic.lastIndexOf('/'), msg.topic.length);
          try{
            slave = parseInt(part);
          } catch (err) {
            //not int
          }
        } else {
          try {
            slave = parseInt(msg.topic);
          } catch (err) {
            //not int
          }
        }
      }

      console.log(node.dtype);

      //if (util.isBuffer(msg.payload)){
        if (node.dtype === 'discrete') {
          node.connection.writeDiscreteInputs(slave, node.start, msg.payload);
        } else if (node.dtype === 'coil') {
          node.connection.writeCoils(slave, node.start, msg.payload);
        } else if (node.dtype === 'input') {
          node.connection.writeInputRegisters(slave, node.start, msg.payload);
        } else if (node.dtype === 'holding') {
          node.connection.writeHoldingRegisters(slave, node.start, msg.payload);
        }
      //}
    });
  };

  RED.nodes.registerType('modbusSerial out', write);
}
