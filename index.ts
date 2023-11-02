import { readFileSync } from 'fs'
import cron from 'node-cron'
import moment from 'moment-timezone'
import pm2 from 'pm2'
console.log('Application Initialized!')

interface Client {
  name: string
  enabled: number[]
}

let firstStart = true

const jsonClients: Client[] = JSON.parse(readFileSync('./clients.json', 'utf-8'))

async function getListProcessPM2 (): Promise<pm2.ProcessDescription[]> {
  return await new Promise((resolve, reject) => {
    pm2.list((err, list) => {
      if (err) {
        reject(err)
      }
      resolve(list)
    })
  })
}
async function intervalApplication (): Promise<void> {
  const hour = moment().tz('America/Sao_Paulo').hour()
  const listProcess = await getListProcessPM2()
  if (!jsonClients.map(c => c.enabled).flat().includes(hour) && !firstStart) {
    console.log('Nothing to do')
    return
  }
  firstStart = false
  for (const client of jsonClients) {
    const process = listProcess.find((p) => p.name === client.name)
    if (client.enabled.includes(hour)) {
      console.log(`Running ${client.name}`)
      if (process) {
        pm2.restart(process.pm_id as number, (err, proc) => {
          if (err) {
            console.error(err)
          }
          console.log(proc)
        })
        // Restart after 1 minute
        setTimeout(async () => {
          pm2.stop(process.pm_id as number, (err, proc) => {
            if (err) {
              console.error(err)
            }
            console.log(proc)
          })
          await new Promise((resolve) => setTimeout(resolve, 5000))
          pm2.restart(process.pm_id as number, (err, proc) => {
            if (err) {
              console.error(err)
            }
            console.log(proc)
          })
        }, 60000)
      } else {
        console.log('Process not found')
      }
    } else {
      console.log(`Stopping ${client.name}`)
      if (process) {
        pm2.stop(process.pm_id as number, (err, proc) => {
          if (err) {
            console.error(err)
          }
          console.log(proc)
        })
      } else {
        console.log('Process not found')
      }
    }
  }
}
void intervalApplication()
cron.schedule('0 * * * *', async () => {
  console.log('Running a task every hour')
  await intervalApplication()
})
