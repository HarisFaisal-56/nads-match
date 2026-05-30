import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http(),
});

async function main() {
  const event = parseAbiItem('event ScoreSubmitted(address indexed player, uint256 score, uint256 level)');
  const latestBlock = await client.getBlockNumber();
  
  // Let's do 100k blocks back, in 10k chunks
  const CHUNK_SIZE = 10000n;
  const TOTAL_BLOCKS = 100000n;
  const startBlock = latestBlock - TOTAL_BLOCKS;
  
  let allLogs = [];
  let chunks = [];
  for (let i = startBlock; i < latestBlock; i += CHUNK_SIZE) {
    chunks.push({
      fromBlock: i,
      toBlock: i + CHUNK_SIZE - 1n > latestBlock ? latestBlock : i + CHUNK_SIZE - 1n
    });
  }
  
  console.log(`Fetching ${chunks.length} chunks...`);
  try {
    const results = await Promise.all(chunks.map(chunk => 
      client.getLogs({
        address: '0x7F8ABBa2bC8Bd8472C76e6d7fC8cD36f223f0496',
        event,
        fromBlock: chunk.fromBlock,
        toBlock: chunk.toBlock,
      })
    ));
    allLogs = results.flat();
    console.log('Total logs found:', allLogs.length);
    console.log(allLogs.map(l => l.args.player).join('\n'));
  } catch (err) {
    console.error('Error fetching logs:', err.message);
  }
}

main();
