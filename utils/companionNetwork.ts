import {DeploymentsExtension} from 'hardhat-deploy/dist/types';
import {EthereumProvider} from 'hardhat/types';
import {EIP1193Provider} from 'hardhat/src/types/provider';
import {ethers} from 'hardhat';
import {Contract} from 'ethers';

export async function getContractFromDeployment(
  deployment: {
    deployments: DeploymentsExtension;
    provider: EthereumProvider;
  },
  name: string,
  signer?: string
): Promise<Contract> {
  const d = await deployment.deployments.get(name);
  if (signer) {
    const provider = new ethers.providers.Web3Provider(
      deployment.provider as EIP1193Provider
    );
    return new Contract(d.address, d.abi, provider.getSigner(signer));
  }
  return new Contract(d.address, d.abi);
}
