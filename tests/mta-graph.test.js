/* eslint-disable no-plusplus */
/* eslint-disable no-console */
const fs = require('fs');
const MtaGraph = require('../dist/index');

let mtaGraph;

async function generate() {
    const mtaString = fs.readFileSync('./tests/mta.yaml', 'utf8');

    return MtaGraph.generate(mtaString);
}

function countLinks() {
    let count = 0;
    mtaGraph.nodes.forEach((node) => {
        // eslint-disable-next-line no-unused-vars
        node.links.forEach((_link) => count++);
    });
    return count;
}

beforeAll(async () => {
    mtaGraph = await generate();
});

test('Number of nodes', async () => {
    expect(mtaGraph.nodes.length).toBe(30);
});
test('Number of modules', async () => {
    expect(mtaGraph.moduleNodes.length).toBe(20);
});
test('Number of resources', async () => {
    expect(mtaGraph.resourceNodes.length).toBe(8);
});
test('Number of property sets', async () => {
    expect(Object.values(mtaGraph.propertySets).length).toBe(1);
});
test('Number of links', async () => {
    expect(countLinks()).toBe(34);
});
test('Number of html5 apps', async () => {
    expect(
        mtaGraph.moduleNodes.filter(
            (moduleNode) => moduleNode.type === MtaGraph.nodeType.html5
        ).length
    ).toBe(15);
});
