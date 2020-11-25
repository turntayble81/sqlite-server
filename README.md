# Sqlite Server
Sqlite is capable of handling more load than you'd think. This application creates a server which is connected to with tcp connections, just like all client/server databases. Each connection to the server creates one connection to the database. This is a lightweight alternative to a full-blown client/server database, such as MySQL or Postgres. Configuration is very simple, and all data is stored in a single sqlite db file. The sqlite file can still be accessed the way you normally would, and the server can be put in front of an existing database. 

I'm just getting started on this project. More features to come.

### Response Format
Server responses are sent in a delimited format:
```
SOH	01	start of header
    DC1 11 device control 1
        <request id>
    DC1 11 device control 1
    SOH	01	start of header
        <header row>
        <record row 1>
        <record row 2>
        <record row n>
EOT	04	end of transmission
```

Column delimiter (3 bytes):
```
NUL	00	null character
RS	30	record separator
NUL	00	null character
```

Row delimiter (3 bytes):
```
NUL	00	null character
US	31	unit separator
NUL	00	null character
```

Queries which do not return a result simply return an acknowledgement:
SOH	01	start of header
    ACK	6	acknowledgement
EOT	04	end of transmission

If server is actively draining the connection, it will return a negative acknowledgement for any requests until the connection is closed:
```
SOH	01	start of header
    NAK	21	negative acknowledgement
EOT	04	end of transmission
```

If an error is returned from the server, it will be text wrapped in the following characters:
```
SOH	01	start of header
    DC1 11 device control 1
        <request id>
    DC1 11 device control 1
    BEL	7	bell
        <error text>
EOT	04	end of transmission
```