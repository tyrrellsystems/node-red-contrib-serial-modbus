# node-red-contrib-serial-modbus

A node to read data via Modbus over RS485 serial.

Output or Input of type buffer.  

If value is bigger than one register/coil it will continue to the next one

## Install

npm install node-red-contrib-serial-modbus

## Usage

### Config node

Both the read and write nodes share a config node that holds the details of 
RS485 port used to connect to the bus.

 - Device
 - Speed
 - Data bits
 - Parity
 - Stop Bits

### Read node

The read node takes the following list of inputs

 - A list of slaves to poll
 - The offset to the first record
 - The number of records to read
 - The type of record (coil,register)
 - A polling interval in seconds

### Write node

The write node takes the following inputs

 - Slave to send the data to, if the salve is not set then it can
 be taken from the topic. If the topic has '/' it will take the
 last element and try and parse a number to use as the slave
 - The type of record to write
 - The offset to write the data to


## Formating data

Both the Read and the Write node work with Buffer objects, these represent
the raw data being transfered. To turn this into real values there are a 
number of approaches that can be taken.

### Buffer methods

The Buffer module has a selection of methods that lets you read/write Integer
and Floating point values at different lengths and endian modes.

A full list of methods can be found [here](https://nodejs.org/docs/v0.10.48/api/buffer.html).

You can use these methods in a Function node to unpack a buffer after a read
node or to build a buffer object before a write node.

### Node-RED node-red-contrib-binary

The [node-red-contrib-binary](http://flows.nodered.org/node/node-red-contrib-binary) 
node allows will automatically convert a JSON object to a buffer and also parse
buffers to JSON objects.

The node uses a pattern language to describe the layout of the buffer. Details of
language are documented in the [packet](https://github.com/bigeasy/packet) node
