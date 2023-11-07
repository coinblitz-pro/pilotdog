import axios from 'axios'
import chalk from 'chalk'
import dayjs from 'dayjs'
import { FingerprintGenerator } from 'fingerprint-generator'
import { readFileSync } from 'fs'
import { HttpsProxyAgent } from 'hpagent'
import { printBanner } from './banner'

main()

async function main() {
  await printBanner()

  const addresses = readFileSync('./data/addresses.txt').toString().split('\n').filter(r => r).map(row => row.trim())
  const proxies = readFileSync('./data/proxies.txt').toString().split('\n').filter(r => r).map(row => row.trim())

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i]
    const proxy = proxies[i % proxies.length]

    const httpsAgent = await getProxyAgent(proxy)
    const headers = await getHeaders()

    const { data } = await axios.get<EligibleResponse>(`https://www.pilotdog.tech/api/get_eligible?address=${address}`, { httpsAgent, headers })
    lg(`${address} has ${chalk.bold(data.data.claimable_amount)} eligible tokens, gas cost is ${data.data.eth_gas_cost}`)
  }
}


async function getProxyAgent(proxy?: string) {
  if (proxy === undefined) {
    return undefined
  }

  const [ uri, reboot ] = proxy.split('#')

  if (reboot) {
    process.stdout.write(`rebooting proxy`)
    await axios.get(reboot)
    process.stdout.write(`\rsleep 40s after rebooting proxy\r`)
    await sleep(40)
  }

  return new HttpsProxyAgent({ keepAlive: true, proxy: `http://${uri}` })
}

async function getHeaders() {
  const fingerprint = new FingerprintGenerator().getHeaders()
  return {
    'Accept': '*/*',
    'Accept-language': fingerprint['accept-language'],
    'Cache-control': 'no-cache',
    'Pragma': 'no-cache',
    'DNT': '1',
    'Referer': 'https://www.pilotdog.tech/',
    'User-Agent': fingerprint['user-agent'],
    'sec-ch-ua': fingerprint['sec-ch-ua'],
    'sec-ch-ua-mobile': fingerprint['sec-ch-ua-mobile'],
    'sec-ch-ua-platform': fingerprint['sec-ch-ua-platform'],
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  }
}

async function sleep(time: number) {
  await new Promise(resolve => setTimeout(resolve, time * 1000))
}

export function lg(message: string) {
  console.log(`[${dayjs().format('DD.MM.YYYY hh:mm.ss')}] ${message}`)
}

type EligibleResponse = {
  data: {
    eth_gas_cost: string
    claimable_amount: string
  }
}
