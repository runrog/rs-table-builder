## Rackspace Table Builder.
For tables used on rackspace.com

![](rs-table-builder.gif)

### Install and Run
```
npm install
```
```
npm start
```

### Distributing
When you're ready to distribute the goods, run the below command. This will compile/transpile/minimize everything and place all in the ```dist/``` folder.
```
gulp build-dist
```

### Gulp Tasks
Gulp tasks will run automatically but to manually run them:

As this repository consumes Zoolander, you can manually bring in the latest content like so:
```
gulp build-zoolander
```

Building Javascript: This will concat the js files together in order by name:
```
gulp build-js
```

Building SASS
```
gulp build-sass
```

Compressing Images
```
gulp build-images
```

Using JS Node Modules on the client
```
gulp build-js-modules
```

### Testing
Create your ```*.spec.js``` files as needed inside ```src/js/*```
```
npm run test
```
