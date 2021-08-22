/* eslint no-param-reassign: ["error", { "props": false }] */
/* eslint-disable no-plusplus */
/* eslint-disable no-console */

const YAML = require('yaml');
const { exit } = require('process');
const assert = require('assert');

const nodeCategory = {
    module: 'module',
    resource: 'resource',
    destination: 'destination',
    property: 'property',
    enviromentVariable: 'enviromentVariable',
};

const nodeType = {
    nodejs: 'CAP',
    approuter: 'APPROUTER',
    portalDeployer: 'PORTAL DEPLOYER',
    dbDeployer: 'DB DEPLOYER',
    appsDeployer: 'APPS DEPLOYER',
    destinationsDeployer: 'DESTINATIONS DEPLOYER',
    deployer: 'DEPLOYER',
    html5: 'APP HTML5',
    serviceHanaInstance: 'SERVICE HANA CLOUD',
    serviceHtml5Repo: 'SERVICE HTML5 REPOSITORY',
    serviceXsuaa: '👤 SERVICE XSUAA',
    serviceDestination: 'SERVICE DESTINATION',
    serviceApplicationLog: '🕮 SERVICE APPLICATION LOG',
    servicePortal: 'SERVICE PORTAL',
    serviceWorkflow: 'SERVICE WORKFLOW',
    serviceTheming: 'SERVICE THEMING',
    userService: 'USER PROVIDED SERVICE',
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
    useAppsFrom: 'use apps from\nHTML5 repository',
    deployAppsTo: 'deploy apps to\nHTML5 repository',
    deployWorkflowDefinition: 'deploy workflow definition to',
    deployApp: 'deploy app',
    publishAppsTo: 'publish apps into',
    logTo: 'log to',
    defineMtaProperty: 'define MTA property',
    defineEnvVariable: 'define enviroment\nvariable',
    useMtaProperty: 'use MTA property',
};

function getDeployerType(nodeInfo) {
    assert(
        typeof nodeInfo.contentTarget === 'object',
        `Module of type deployer without target content, module: ${nodeInfo.name} content-target: ${nodeInfo.contentTarget}`
    );

    switch (nodeInfo.contentTarget.type) {
        case nodeType.servicePortal:
            return nodeType.portalDeployer;
        case nodeType.serviceHtml5Repo:
            return nodeType.appsDeployer;
        case nodeType.serviceDestination:
            return nodeType.destinationsDeployer;
        default:
            console.log(
                `Using the generic deployer for the service "${nodeInfo.contentTarget.type}",\nplease notify this to the mta-deps-parser package maintainer with:\nhttps://github.com/sbarzaghialteaup/mta-deps-parser/issues/new`
            );
            return nodeType.deployer;
    }
}

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
        if (nodeInfo.additionalInfo.type === 'com.sap.application.content') {
            return getDeployerType(nodeInfo);
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
            if (nodeInfo.additionalInfo.service === 'theming') {
                return nodeType.serviceTheming;
            }
        }

        if (
            nodeInfo.additionalInfo.type === 'org.cloudfoundry.existing-service'
        ) {
            if (!nodeInfo.additionalInfo.service) {
                return nodeType.userService;
            }
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
        link.sourceNode.type === nodeType.destinationsDeployer &&
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
        link.sourceNode.type === nodeType.appsDeployer &&
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

    deployerNode.additionalInfo.module?.requires?.forEach((serviceRequired) =>
        serviceRequired.parameters?.content?.subaccount?.destinations?.forEach(
            addNodeForDestination(linkType.defineDestinationInSubaccount)
        )
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

/**
 *
 * @param {*} mta
 * @param {MtaGraph} mtaGraph
 */
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

        mtaGraph.addNode(newNode);
    });
}

/**
 *
 * @param {MtaGraph} mtaGraph
 */
function extractPropertySets(mtaGraph) {
    mtaGraph.moduleNodes.forEach((moduleNode) => {
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

/*
 * @param {MtaGraph} mtaGraph
 */
function extractPropertiesFromResources(mtaGraph) {
    mtaGraph.resourceNodes.forEach((resourceNode) => {
        if (resourceNode.additionalInfo.resource.properties) {
            mtaGraph.propertySets[resourceNode.name] = resourceNode;

            Object.entries(
                resourceNode.additionalInfo.resource.properties
            ).forEach(([key, value]) => {
                const newPropertyNode = {
                    type: nodeType.property,
                    name: `${resourceNode.name}:${key}`,
                    value,
                    additionalInfo: {
                        category: nodeCategory.property,
                    },
                };

                mtaGraph.addNode(newPropertyNode);

                resourceNode.links.push({
                    type: linkType.defineMtaProperty,
                    name: newPropertyNode.name,
                });
            });
        }
    });
}

/**
 *
 * @param {MtaGraph} mtaGraph
 */
function extractModulesRequirements(mtaGraph) {
    mtaGraph.moduleNodes.forEach((moduleNode) => {
        moduleNode.additionalInfo.module.requires?.forEach((require) => {
            if (require.group) {
                return;
            }

            moduleNode.links.push({
                name: require.name,
            });

            if (require.parameters?.['content-target']) {
                moduleNode.contentTarget =
                    mtaGraph.indexServiceName[require.name];
            }
        });
    });
}

/**
 *
 * @param {MtaGraph} mtaGraph
 */
function moduleNodesTypeDetermination(mtaGraph) {
    mtaGraph.moduleNodes.forEach((moduleNode) => {
        moduleNode.type = getNodeType(moduleNode);
    });
}

/**
 *
 * @param {MtaGraph} mtaGraph
 */
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

            if (!require.group) {
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

/**
 *
 * @param {*} mta
 * @param {MtaGraph} mtaGraph
 */
function extractResources(mta, mtaGraph) {
    mta.resources?.forEach((resource) => {
        const newNode = {
            name: resource.name,
            additionalInfo: {
                category: nodeCategory.resource,
                type: resource.type,
                service: resource.parameters?.service,
                resource,
            },
        };

        newNode.type = getNodeType(newNode);

        mtaGraph.addNode(newNode);
    });
}

/**
 *
 * @param {MtaGraph} mtaGraph
 */
function setLinksType(mtaGraph) {
    mtaGraph.nodes.forEach((node) => {
        node.links
            ?.filter((link) => !link.type)
            .forEach((link) => {
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

/**
 *
 * @param {MtaGraph} mtaGraph
 */
function extractDestinationsFromModules(mtaGraph) {
    mtaGraph.nodes.forEach((node) => {
        switch (node.type) {
            case nodeType.destinationsDeployer:
                lookForDeployedDestinations(node, mtaGraph);
                break;
            case nodeType.appsDeployer:
                lookForDeployedApps(node);
                break;
            default:
                break;
        }
    });
}

/**
 *
 * @param {MtaGraph} mtaGraph
 */
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

/**
 *
 * @param {MtaGraph} mtaGraph
 */
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
                link.cluster = 'DESTINATIONS';
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

        if (newNode.additionalInfo.category === nodeCategory.resource) {
            this.indexServiceName[newNode.name] = newNode;

            const serviceName =
                newNode.additionalInfo.resource?.parameters?.['service-name'];
            if (serviceName) {
                this.indexServiceName[serviceName] = newNode;
            }
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

    extractResources(mta, mtaGraph);

    extractModules(mta, mtaGraph);

    extractPropertiesFromResources(mtaGraph);

    extractPropertySets(mtaGraph);

    extractModulesRequirements(mtaGraph);

    moduleNodesTypeDetermination(mtaGraph);

    extractEnviromentVariables(mtaGraph);

    setLinksType(mtaGraph);

    extractDestinationsFromModules(mtaGraph);

    extractDestinationsFromResources(mtaGraph);

    setClusterToLinks(mtaGraph);

    return mtaGraph;
}

module.exports.parse = parse;
module.exports.nodeCategory = nodeCategory;
module.exports.nodeType = nodeType;
module.exports.linkType = linkType;
