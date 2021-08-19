/* eslint-disable no-plusplus */
/* eslint-disable no-console */
const fs = require('fs');
const MtaGraph = require('../src/mta-deps-parser');

let mtaGraph;

async function parse() {
    const mtaString = fs.readFileSync('./tests/mta.yaml', 'utf8');

    return MtaGraph.parse(mtaString);
}

function countLinks() {
    let count = 0;
    mtaGraph.nodes.forEach((node) => {
        node.links.forEach(() => count++);
    });
    return count;
}

beforeAll(async () => {
    mtaGraph = await parse();
});

test('Number of nodes', async () => {
    expect(mtaGraph.nodes.length).toBe(31);
});
test('Number of modules', async () => {
    expect(mtaGraph.moduleNodes.length).toBe(20);
});
test('Number of resources', async () => {
    expect(mtaGraph.resourceNodes.length).toBe(8);
});
test('Number of property sets', async () => {
    expect(Object.values(mtaGraph.propertySets).length).toBe(2);
});
test('Number of links', async () => {
    expect(countLinks()).toBe(35);
});
test('Number of html5 apps', async () => {
    expect(
        mtaGraph.moduleNodes.filter(
            (moduleNode) => moduleNode.type === MtaGraph.nodeType.html5
        ).length
    ).toBe(15);
});
