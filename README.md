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

The write node takes the following inputs

 - Slave to send the data to, if the salve is not set then it can
 be taken from the topic. If the topic has '/' it will take the
 last element and try and parse a number to use as the slave
 - The type of record to write
 - The offset to write the data to
