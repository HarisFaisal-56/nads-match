import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http(),
});

async function main() {
  const event = parseAbiItem('event ScoreSubmitted(address indexed player, uint256 score, uint256 level)');
  const latestBlock = await client.getBlockNumber();
  const fromBlock = latestBlock - 500000n;
  
  console.log('Querying from block', fromBlock, 'to latest');
  try {
    const logs = await client.getLogs({
      address: '0x7F8ABBa2bC8Bd8472C76e6d7fC8cD36f223f0496',
      event,
      fromBlock,
      toBlock: 'latest',
    });
    console.log('Logs found:', logs.length);
  } catch (err) {
    console.error('Error fetching logs:', err.message);
  }
}

main();
