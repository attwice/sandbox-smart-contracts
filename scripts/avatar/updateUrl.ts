import hre, {ethers, getNamedAccounts} from 'hardhat';
import {getArgParser} from '../utils/utils';

async function main() {
  if (hre.network.name !== 'mumbai') {
    throw new Error(
      `This script must be run on mumbai, invalid network ${hre.network.name}`
    );
  }

  const parser = getArgParser({
    description: `RUN WITH: yarn execute mumbai ${process.argv[0]}`,
  });
  parser.addArgument(['url'], {help: 'new url'});
  const processArgs = parser.parseArgs();
  const url = processArgs.url.replace(/\/$/, '') + '/';
  // setBaseUrl
  //  ipfs://QmZLR3pHqh3g9wtmEmfdK9jzKK9WP7iL45kLtLifd3GZvm/
  const {sandAdmin} = await getNamedAccounts();
  const avatarContract = await ethers.getContract('PolygonAvatar', sandAdmin);
  console.log(
    'Changing url from ',
    await avatarContract.baseTokenURI(),
    'to',
    url
  );
  const setBaseUrlTx = await avatarContract.setBaseUrl(url);
  const setBaseUrlTxResult = await setBaseUrlTx.wait();
  console.log('setBaseUrl result', setBaseUrlTxResult);
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
