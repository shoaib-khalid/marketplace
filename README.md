To run this project correctly on local:

1. Add a url for a store on your hosts file that redirects to "127.0.0.1". For example:

```
127.0.0.1   deliverin.localhost
127.0.0.1   deliverin-pk.localhost
```

2. Start the server with the command:

```
ng s --host 0.0.0.0 --disable-host-check --port [portnumber]
```

3. Open the url which you added to the hosts file, in your browser with the port number. Like so:

```
http://deliverin.localhost:[portnumber]/

OR

http://deliverin-pk.localhost:[portnumber]/
```
4. To build this application, execute below command:
- for web :
```
ng build 
```
- for android mobile app
```
ng build --output-path=www
npx cap sync android
npx cap open android
```