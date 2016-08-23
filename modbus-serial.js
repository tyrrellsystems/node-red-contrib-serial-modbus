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

"use strict";
var modbus = require('modbus-serial');
var bluebird = require('bluebird');

module.exports = function(RED) {
  function read(n) {
    RED.nodes.createNode(this,n);
    this.port = n.port;
    this.baud = n.baud;
    this.data = n.data;
    this.parity = n.parity;
    this.stop = n.stop;

    this.slaves = n.slaves;
    this.start = n.start;
    this.count = n.count;
    this.dtype = n.dtype;

    this.period = n.period;

    this.topic = n.topic;

    var node = this;

    node.client = new modbus();
    try {

      node.client.setTimeout(1000);
      node.client.connectRTUBuffered(node.port, {
        baudrate: node.baud, 
        dataBits: node.data, 
        parity: node.parity, 
        stopBits: node.stop},
        function() {          
          node.status({fill:"green", shape: "dot", text:"connected"});
          node.interval = setInterval(poll, (1000 * node.period));
          poll();
        });
    } catch(err) {
      node.error(err);
      node.status({fill:"red", shape: "dot", text:"disconnected"});
    }

    function poll() {
      var slaves = [];
      if (node.slaves.indexOf(',')) {
        slaves = node.slaves.split(',');
      } else {
        slaves.push(node.slaves);
      }

      node.log(slaves);

      function pull(list) {
        if (!list.length) {
          //console.log("empty list");
          return;
        }

        var slave = list[0];
        var promise = new bluebird(function(resolve,reject){
          node.client.setID(slave);

          var readProm;
          if (node.dtype === 'discrete') {
            readProm = node.client.readDiscreteInputs(node.start, node.count);
          } else if (node.dtype === 'coil') {
            readProm = node.client.readCoils(node.start, node.count);
          } else if (node.dtype === 'input') {
            readProm = node.client.readInputRegisters(node.start, node.count)
          } else if (node.dtype === 'holding') {
            readProm = node.client.readHoldingRegisters(node.start, node.count);
          }

          //console.log(readProm);

          readProm
          .catch(function(err){
             //warn
             node.warn("failed to read from slave: " + slave);
             console.log(err);
          })
          .then(function(data){
            var msg = {
              topic: node.topic +'/' + slave,
              payload: data.buffer
            };
            node.send(msg);
            resolve();
          });
        });

        promise.error(function(){
          //console.log("error");
          pull(slaves.slice(1));
        })
        .then(function() {
          //console.log("success");
          pull(slaves.slice(1));
        });
      }
      pull(slaves);
    };

    node.on('close', function(done){
      node.client.close(function(){
        done();
      });
    })
  }

  RED.nodes.registerType('modbusSerial in', read);
}