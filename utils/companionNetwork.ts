import {DeploymentsExtension} from 'hardhat-deploy/dist/types';
import {EthereumProvider} from 'hardhat/types';
import {EIP1193Provider} from 'hardhat/src/types/provider';
import {ethers} from 'hardhat';

export async function getContractFromDeployment(
  deployment: {
    deployments: DeploymentsExtension;
    provider: EthereumProvider;
  },
  name: string,
  signer?: string
) {
  const d = await deployment.deployments.get(name);
  if (signer) {
    const provider = new ethers.providers.Web3Provider(
      deployment.provider as EIP1193Provider
    );
    return new ethers.Contract(d.address, d.abi, provider.getSigner(signer));
  }
  return new ethers.Contract(d.address, d.abi);
}
