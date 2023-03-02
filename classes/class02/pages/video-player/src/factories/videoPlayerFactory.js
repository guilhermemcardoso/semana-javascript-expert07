import Camera from '../../../../lib/shared/camera.js'
import { supportsWorkerType } from '../../../../lib/shared/utils.js'
import VideoPlayerController from '../controllers/videoPlayerController.js'
import VideoPlayerService from '../services/videoPlayerService.js'
import VideoPlayerView from '../views/videoPlayerView.js'

async function getWorker() {
  if (supportsWorkerType()) {
    console.log('initializing esm workers')
    const worker = new Worker('./src/workers/videoPlayerWorker.js', {
      type: 'module',
    })

    return worker
  }

  console.warn(`your browser doesn't support esm modules on webworkers`)
  console.warn(`Importing libraries...`)
  await import('https://unpkg.com/@tensorflow/tfjs-core@2.4.0/dist/tf-core.js')
  await import(
    'https://unpkg.com/@tensorflow/tfjs-converter@2.4.0/dist/tf-converter.js'
  )
  await import(
    'https://unpkg.com/@tensorflow/tfjs-backend-webgl@2.4.0/dist/tf-backend-webgl.js'
  )
  await import(
    'https://unpkg.com/@tensorflow-models/face-landmarks-detection@0.0.1/dist/face-landmarks-detection.js'
  )

  console.warn(`using worker mock instead!`)

  const service = new VideoPlayerService({
    faceLandmarksDetection: window.faceLandmarksDetection,
  })

  const workerMock = {
    async postMessage(video) {
      const blinked = await service.hadBlinked(video)
      if (!blinked) return
      workerMock.onmessage({ data: { blinked } })
    },
    //vai ser sobrescrito pela controller
    onmessage(msg) {},
  }

  console.log('loading tf module...')
  await service.loadModel()
  console.log('tf model loaded...')

  setTimeout(() => {
    worker.onmessage({ data: 'READY' })
  }, 500)
  return workerMock
}

const worker = await getWorker()

const camera = await Camera.init()
const [rootPath] = window.location.href.split('/pages/')
const factory = {
  async initalize() {
    return VideoPlayerController.initialize({
      view: new VideoPlayerView(),
      worker,
      camera,
    })
  },
}

export default factory
