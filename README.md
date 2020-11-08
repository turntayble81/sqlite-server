# Sqlite Server
Sqlite is capable of handling more load than you'd think. This application creates a server which is connected to with tcp connections, just like all client/server databases. Each connection to the server creates one connection to the database. This is a lightweight alternative to a full-blown client/server database, such as MySQL or Postgres. Configuration is very simple, and all data is stored in a single sqlite db file. The sqlite file can still be accessed the way you normally would, and the server can be put in front of an existing database. 

I'm just getting started on this project. More features to come.

### Response Format
Server responses are sent in a delimited format. Response structure:

```
Record transmission structure:
    SOH	01	start of header
        <header row>

    STX	02	start of text
        <record row>
        ...
    EOT	04	end of transmission

Binary columns should be wrapped in the following characters:
    STX	02	start of text
    <binary data>
    ETX	03	end of text

Column delimiter:
    NUL	00	null character

Row delimiter:
    LF	10	line feed
```