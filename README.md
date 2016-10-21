#node-red-contrib-serial-modbus

A node to read data via Modbus over RS485 serial

##Install

npm install node-red-contrib-serial-modbus

##Usage

###Config node

Both the read and write nodes share a config node that holds the details of 
RS485 port used to connect to the bus.

 - Device
 - Speed
 - Data bits
 - Parity
 - Stop Bits

###Read node

The read node takes the following list of inputs

 - A list of slaves to poll
 - The offset to the first record
 - The number of records to read
 - The type of record (coil,register)
 - A polling interval in seconds

###Write node