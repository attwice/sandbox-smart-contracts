import {DeploymentsExtension} from 'hardhat-deploy/dist/types';
import {EthereumProvider} from 'hardhat/types';
import {EIP1193Provider} from 'hardhat/src/types/provider';
import {ethers} from 'hardhat';
import {Contract} from 'ethers';
import {Address} from 'hardhat-deploy/types';

export type ICompanionNetwork = {
  deployments: DeploymentsExtension;
  getNamedAccounts: () => Promise<{
    [name: string]: Address;
  }>;
  getUnnamedAccounts: () => Promise<string[]>;
  getChainId(): Promise<string>;
  provider?: EthereumProvider;
};
export async function getContractFromDeployment(
  net: ICompanionNetwork,
  name: string,
  signer?: string
): Promise<Contract> {
  const d = await net.deployments.get(name);
  if (signer) {
    if (net.provider) {
      const provider = new ethers.providers.Web3Provider(
        net.provider as EIP1193Provider
      );
      return new Contract(d.address, d.abi, provider.getSigner(signer));
    }
    return new Contract(d.address, d.abi, await ethers.getSigner(signer));
  }
  return new Contract(d.address, d.abi);
}
