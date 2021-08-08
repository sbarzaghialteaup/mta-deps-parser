/* eslint no-param-reassign: ["error", { "props": false }] */
/* eslint-disable no-plusplus */
/* eslint-disable no-console */

const YAML = require('yaml');
const { exit } = require('process');

const nodeCategory = {
    module: 'module',
    resource: 'resource',
    destination: 'destination',
    property: 'property',
    enviromentVariable: 'enviromentVariable',
};

const nodeType = {
    nodejs: 'CAP SERVICE',
    approuter: 'APPROUTER',
    portalDeployer: 'PORTAL DEPLOYER',
    dbDeployer: 'DB DEPLOYER',
    deployer: 'DEPLOYER',
    html5: 'APP HTML5',
    serviceHanaInstance: 'HANA CLOUD',
    serviceHtml5Repo: 'HTML5 REPOSITORY',
    serviceXsuaa: 'SERVICE XSUAA',
    serviceDestination: 'SERVICE DESTINATION',
    serviceApplicationLog: 'SERVICE APPLICATION LOG',
    servicePortal: 'SERVICE PORTAL',
    serviceWorkflow: 'SERVICE WORKFLOW',
    destination: 'DESTINATION',
    destinationURL: 'DESTINATION URL',
    property: 'PROPERTY',
    enviromentVariable: 'ENV VARIABLE',
    other: 'OTHER',
};

const linkType = {
    readWrite: 'read/write',
    deployTablesTo: 'deploy tables to',
    createDestinationService: 'create destination service',
    useXsuaaService: 'use xsuaa service',
    defineDestinationInService: 'define destination\nat destination level',
    defineDestinationInSubaccount: 'define destination\nat subaccount level',
    pointToService: 'point to service',
    pointToUrl: 'point to url',
    useAppsFrom: 'use apps from',
    deployAppsTo: 'deploy apps to',
    deployWorkflowDefinition: 'deploy workflow definition to',
    deployApp: 'deploy app',
    publishAppsTo: 'publish apps into',
    logTo: 'log to',
    defineMtaProperty: 'define MTA property',
    defineEnvVariable: 'define enviroment\nvariable',
    useMtaProperty: 'use MTA property',
};

function getNodeType(nodeInfo) {
    if (nodeInfo.additionalInfo.category === nodeCategory.module) {
        if (nodeInfo.additionalInfo.module.path?.search('approuter') >= 0) {
            return nodeType.approuter;
        }
        if (nodeInfo.additionalInfo.type === 'nodejs') {
            return nodeType.nodejs;
        }
        if (nodeInfo.additionalInfo.type === 'hdb') {
            return nodeType.dbDeployer;
        }
        if (
            nodeInfo.additionalInfo.type === 'com.sap.application.content' &&
            nodeInfo.additionalInfo.module.path?.search('portal') >= 0
        ) {
            return nodeType.portalDeployer;
        }
        if (nodeInfo.additionalInfo.type === 'com.sap.application.content') {
            return nodeType.deployer;
        }
        if (nodeInfo.additionalInfo.type === 'html5') {
            return nodeType.html5;
        }
    }

    if (nodeInfo.additionalInfo.category === nodeCategory.resource) {
        if (nodeInfo.additionalInfo.type === 'com.sap.xs.hdi-container') {
            return nodeType.serviceHanaInstance;
        }
        if (
            nodeInfo.additionalInfo.type === 'org.cloudfoundry.managed-service'
        ) {
            if (nodeInfo.additionalInfo.service === 'html5-apps-repo') {
                return nodeType.serviceHtml5Repo;
            }
            if (nodeInfo.additionalInfo.service === 'destination') {
                return nodeType.serviceDestination;
            }
            if (nodeInfo.additionalInfo.service === 'application-logs') {
                return nodeType.serviceApplicationLog;
            }
            if (nodeInfo.additionalInfo.service === 'portal') {
                return nodeType.servicePortal;
            }
            if (nodeInfo.additionalInfo.service === 'workflow') {
                return nodeType.serviceWorkflow;
            }
        }

        if (
            nodeInfo.additionalInfo.type === 'org.cloudfoundry.existing-service'
        ) {
            if (nodeInfo.additionalInfo.service === 'workflow') {
                return nodeType.serviceWorkflow;
            }
        }
        if (nodeInfo.additionalInfo.service === 'xsuaa') {
            return nodeType.serviceXsuaa;
        }
    }

    return nodeType.other;
}

function getLinkType(link) {
    if (link.destNode.type === nodeType.serviceApplicationLog) {
        return linkType.logTo;
    }

    if (
        link.sourceNode.type === nodeType.nodejs &&
        link.destNode.type === nodeType.serviceHanaInstance
    ) {
        return linkType.readWrite;
    }

    if (
        link.sourceNode.type === nodeType.dbDeployer &&
        link.destNode.type === nodeType.serviceHanaInstance
    ) {
        return linkType.deployTablesTo;
    }

    if (
        link.sourceNode.type === nodeType.deployer &&
        link.destNode.type === nodeType.serviceDestination
    ) {
        return linkType.createDestinationService;
    }

    if (link.destNode.type === nodeType.serviceXsuaa) {
        return linkType.useXsuaaService;
    }

    if (
        link.sourceNode.type === nodeType.portalDeployer &&
        link.destNode.type === nodeType.serviceHtml5Repo
    ) {
        return linkType.useAppsFrom;
    }

    if (
        link.sourceNode.type === nodeType.portalDeployer &&
        link.destNode.type === nodeType.servicePortal
    ) {
        return linkType.publishAppsTo;
    }

    if (
        link.sourceNode.type === nodeType.deployer &&
        link.destNode.type === nodeType.serviceHtml5Repo
    ) {
        return linkType.deployAppsTo;
    }

    if (
        link.sourceNode.type === nodeType.deployer &&
        link.destNode.type === nodeType.serviceWorkflow
    ) {
        return linkType.deployWorkflowDefinition;
    }

    return 'use';
}

function getServiceDestinationNode(node) {
    const serviceDestinationLink = node.links.find(
        (link) => link.destNode.type === nodeType.serviceDestination
    );

    if (!serviceDestinationLink) {
        console.error(
            `Module ${node.name} with defined destinations but without service destination`
        );
        process.exit(1);
    }

    if (!serviceDestinationLink.destNode) {
        console.error(
            `Resource ${serviceDestinationLink.name} required by module ${node.name}`
        );
        process.exit(1);
    }

    return serviceDestinationLink.destNode;
}

function lookForDeployedDestinations(deployerNode, mtaGraph) {
    function addNodeForDestination(useLinkType) {
        return (destination) => {
            const newDestinationNode = {
                name: destination.Name,
                type: nodeType.destination,
                additionalInfo: {
                    category: nodeCategory.destination,
                    destination,
                },
            };

            mtaGraph.addNode(newDestinationNode);

            const serviceDestinationNode =
                getServiceDestinationNode(deployerNode);

            serviceDestinationNode.links.push({
                type: useLinkType,
                name: destination.Name,
            });

            const pointToNode =
                mtaGraph.indexServiceName[destination.ServiceInstanceName];

            newDestinationNode.links.push({
                name: pointToNode.name,
                node: pointToNode,
                type: linkType.pointToService,
            });
        };
    }

    deployerNode.additionalInfo.module?.parameters?.content?.instance?.destinations?.forEach(
        addNodeForDestination(linkType.defineDestinationInService)
    );

    deployerNode.additionalInfo.module?.parameters?.content?.subaccount?.destinations?.forEach(
        addNodeForDestination(linkType.defineDestinationInSubaccount)
    );
}

function lookForDeployedApps(node) {
    node.additionalInfo.module?.['build-parameters']?.requires?.forEach(
        (destination) => {
            node.links.push({
                type: linkType.deployApp,
                name: destination.name,
            });
        }
    );
}

function extractModules(mta, mtaGraph) {
    mta.modules.forEach((module) => {
        const newNode = {
            name: module.name,
            additionalInfo: {
                category: nodeCategory.module,
                type: module.type,
                module,
            },
        };

        newNode.type = getNodeType(newNode);

        mtaGraph.addNode(newNode);
    });
}

function extractPropertySets(mtaGraph) {
    mtaGraph.nodes.forEach((moduleNode) => {
        moduleNode.additionalInfo.module.provides?.forEach((provide) => {
            mtaGraph.propertySets[provide.name] = moduleNode;

            Object.entries(provide.properties).forEach(([key, value]) => {
                const newPropertyNode = {
                    type: nodeType.property,
                    name: `${provide.name}:${key}`,
                    value,
                    additionalInfo: {
                        category: nodeCategory.property,
                    },
                };

                mtaGraph.addNode(newPropertyNode);

                moduleNode.links.push({
                    type: linkType.defineMtaProperty,
                    name: newPropertyNode.name,
                });
            });
        });
    });
}

function extractModulesRequirements(mtaGraph) {
    mtaGraph.moduleNodes.forEach((moduleNode) => {
        moduleNode.additionalInfo.module.requires?.forEach((require) => {
            if (mtaGraph.propertySets[require.name]) {
                return;
            }

            moduleNode.links.push({
                name: require.name,
            });
        });
    });
}

function extractEnviromentVariables(mtaGraph) {
    function extractLinksToProperties(require) {
        const links = [];
        const propertiesValue = Object.values(require.properties);

        for (let index = 0; index < propertiesValue.length; index++) {
            const value = propertiesValue[index];

            if (typeof value === 'string' && value.substr(0, 2) === '~{') {
                const variableName = value.substr(2, value.length - 3);
                const nodeName = `${require.name}:${variableName}`;

                links.push({
                    type: linkType.useMtaProperty,
                    name: nodeName,
                });
            }
        }

        return links;
    }

    mtaGraph.moduleNodes.forEach((moduleNode) => {
        moduleNode.additionalInfo.module.requires?.forEach((require) => {
            if (!mtaGraph.propertySets[require.name]) {
                return;
            }

            const newEnvVariableNode = {
                type: nodeType.enviromentVariable,
                name: require.group,
                value: require.properties,
                additionalInfo: {
                    category: nodeCategory.enviromentVariable,
                },
            };

            mtaGraph.addNode(newEnvVariableNode);

            moduleNode.links.push({
                type: linkType.defineEnvVariable,
                name: newEnvVariableNode.name,
            });

            const propertiesLinks = extractLinksToProperties(require);

            newEnvVariableNode.links.push(...propertiesLinks);
        });
    });
}

function extractResources(mta, mtaGraph) {
    mta.resources.forEach((resource) => {
        const newNode = {
            name: resource.name,
            additionalInfo: {
                category: nodeCategory.resource,
                type: resource.type,
                service: resource.parameters.service,
                resource,
            },
        };

        newNode.type = getNodeType(newNode);

        mtaGraph.addNode(newNode);
    });
}

function setLinksType(mtaGraph) {
    mtaGraph.nodes.forEach((node) => {
        node.links
            ?.filter((link) => !link.type)
            .forEach((link) => {
                if (mtaGraph.propertySets[link.name]) {
                    return;
                }

                link.sourceNode = node;
                link.destNode = mtaGraph.linksIndex[link.name];

                if (!link.destNode) {
                    console.error(
                        `Node '${link.sourceNode.name}' require link to node '${link.name}' but node '${link.name}' cannot be resolved`
                    );
                    exit(1);
                }
                link.type = getLinkType(link);
            });
    });
}

function extractDestinationsFromModules(mtaGraph) {
    mtaGraph.nodes.forEach((node) => {
        if (node.type === nodeType.deployer) {
            lookForDeployedDestinations(node, mtaGraph);
            lookForDeployedApps(node);
        }
    });
}

function extractDestinationsFromResources(mtaGraph) {
    mtaGraph.resourceNodes.forEach((node) => {
        node.additionalInfo.resource.parameters?.config?.init_data?.instance?.destinations?.forEach(
            (destination) => {
                const newDestinationNode = {
                    type: nodeType.destination,
                    name: destination.Name,
                    additionalInfo: {
                        category: nodeCategory.destination,
                        destination,
                    },
                };

                mtaGraph.addNode(newDestinationNode);

                node.links.push({
                    type: linkType.defineDestinationInService,
                    name: destination.Name,
                });

                const newUrlNode = {
                    type: nodeType.destinationURL,
                    name: destination.URL,
                    additionalInfo: {
                        category: nodeCategory.destination,
                        destination,
                    },
                };

                mtaGraph.addNode(newUrlNode);

                newDestinationNode.links.push({
                    type: linkType.pointToUrl,
                    name: newUrlNode.name,
                });
            }
        );
    });
}

function setClusterToLinks(mtaGraph) {
    mtaGraph.nodes.forEach((node) => {
        node.links?.forEach((link) => {
            if (
                link.type === linkType.deployTablesTo ||
                link.type === linkType.readWrite
            ) {
                link.cluster = 'CAP SERVICE';
            }

            if (
                link.type === linkType.createDestinationService ||
                link.type === linkType.defineDestinationInService ||
                link.type === linkType.defineDestinationInSubaccount ||
                link.type === linkType.pointToService ||
                link.type === linkType.pointToUrl
            ) {
                link.cluster = 'DESTINATION';
            }

            if (
                link.type === linkType.deployAppsTo ||
                link.type === linkType.deployApp
            ) {
                link.cluster = 'HTML5 APPS';
            }

            if (link.type === linkType.deployWorkflowDefinition) {
                link.cluster = 'WORKFLOW';
            }
        });
    });
}

class MtaGraph {
    constructor() {
        this.nodes = [];
        this.linksIndex = [];
        this.indexServiceName = [];
        this.propertySets = [];
    }

    addNode(newNode) {
        if (!newNode.links) {
            newNode.links = [];
        }
        this.nodes.push(newNode);
        this.linksIndex[newNode.name] = newNode;

        if (newNode.additionalInfo.resource?.parameters['service-name']) {
            this.indexServiceName[
                newNode.additionalInfo.resource.parameters['service-name']
            ] = newNode;
        }
    }

    get moduleNodes() {
        return this.nodes.filter(
            (node) => node.additionalInfo.category === nodeCategory.module
        );
    }

    get resourceNodes() {
        return this.nodes.filter(
            (node) => node.additionalInfo.category === nodeCategory.resource
        );
    }
}

function parse(str) {
    const mtaGraph = new MtaGraph();

    const mta = YAML.parse(str);

    extractModules(mta, mtaGraph);

    extractPropertySets(mtaGraph);

    extractModulesRequirements(mtaGraph);

    extractEnviromentVariables(mtaGraph);

    extractResources(mta, mtaGraph);

    setLinksType(mtaGraph);

    extractDestinationsFromModules(mtaGraph);

    extractDestinationsFromResources(mtaGraph);

    setClusterToLinks(mtaGraph);

    return mtaGraph;
}

module.exports.parse = parse;
module.exports.categories = nodeCategory;
module.exports.nodeType = nodeType;
module.exports.linkType = linkType;
