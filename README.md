# Description
Parse a SAP MTA development descriptor string and expose modules, resources and dependencies between them as Javascript objects.

This package is the base of the [`mta-visual-dep`](https://www.npmjs.com/package/mta-visual-dep) tool.

# Install

NPM package:
```
npm install mta-deps-parser
```

# Usage example

Prerequisite:
**copy a `mta.yaml` file in the root folder**

This example read the file, call the `parse` method and print the list of all the objects and relationships between them to the console.

```javascript
const fs = require('fs');
const MtaDepsParser = require('mta-deps-parser');

const mtaString = fs.readFileSync('./mta.yaml', 'utf8');

const mtaDeps = MtaDepsParser.parse(mtaString);

mtaDeps.nodes.forEach((node) => {
    console.log(`${node.type} ${node.name}:`);
    node.links.forEach((link) => {
        console.log(`   ${link.type} ${link.name}`);
    });
});
```

# API Overview

## MTADeps:

You can image `MTADeps` as a graph, all the modules, resources, properties, etc are nodes, relations between these objects are links between nodes. 

### Parse method:

- `parse(str): object MtaDeps`

### Nodes:
The `nodes` property contains the list of all the modules, resources, properties and enviroment variables defined in the MTA descriptor.
Each node has some properties to describe the node and the property `links` that contains the list of the dependencies with other nodes.

Each node exposes the following properties:

* `category`: category of the node: module, resource, etc, possible categories are exposed as constants defined in [`nodeCategory`](https://github.com/sbarzaghialteaup/mta-deps-parser#node-categories)

* `type`: type of the node, nodejs, generic deployer, approuter, db deployer, xsuaa service, etc, possible types are exposed as constants defined in [`nodeType`](https://github.com/sbarzaghialteaup/mta-deps-parser#node-types)
* `name`: name of the module or resource
* `links`: array with the link to the other nodes, properties:
  * `type`: the type of the link, possible values are exposed as constants defined in [`linkType`](https://github.com/sbarzaghialteaup/mta-deps-parser#link-types)
  * `destNode`: a reference to the destination node
* `additionalInfo`: depending on the type of the node additional properties are available (not yet completely implemented)

### Node Categories:

All node categories are available as constants:
  * `nodeCategory.module`
  * `nodeCategory.resource`
  * `nodeCategory.destination`
  * `nodeCategory.property`
  * `nodeCategory.enviromentVariable`
  
### Node Types:
  
All node types are available as constants:
  * `nodeType.nodejs`
  * `nodeType.approuter`
  * `nodeType.portalDeployer`
  * `nodeType.dbDeployer`
  * `nodeType.deployer`
  * `nodeType.html5`
  * `nodeType.serviceHanaInstance`
  * `nodeType.serviceHtml5Repo`
  * `nodeType.serviceXsuaa`
  * `nodeType.serviceDestination`
  * `nodeType.serviceApplicationLog`
  * `nodeType.servicePortal`
  * `nodeType.serviceWorkflow`
  * `nodeType.destination`
  * `nodeType.destinationURL`
  * `nodeType.property`
  * `nodeType.enviromentVariable`
  * `nodeType.other`

### Link Types:

All link types are available as constants:
  * `linkType.readWrite`
  * `linkType.deployTablesTo`
  * `linkType.createDestinationService`
  * `linkType.useXsuaaService`
  * `linkType.defineDestinationInService`
  * `linkType.defineDestinationInSubaccount`
  * `linkType.pointToService`
  * `linkType.pointToUrl`
  * `linkType.useAppsFrom`
  * `linkType.deployAppsTo`
  * `linkType.deployApp`
  * `linkType.publishAppsTo`
  * `linkType.logTo`
  * `linkType.defineMtaProperty`
  * `linkType.defineEnvVariable`
  * `linkType.useMtaProperty`