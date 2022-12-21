import express, { NextFunction, Request, Response } from 'express'
import fs from 'fs'
import ytdl from 'ytdl-core'
import cp from 'child_process'
import ffmpeg from 'ffmpeg-static'
/* ffmpeg example for merging audio and video https://github.com/fent/node-ytdl-core/blob/HEAD/example/ffmpeg.js */
const app = express()

type IReadStream = {
  start: number
  audio: { downloaded: number; total: typeof Infinity }
  video: { downloaded: number; total: typeof Infinity }
  merged: {
    frame?: string
    speed?: string
    fps?: string
    stream_0_1_q?: string
    bitrate?: string
    total_size?: string
    out_time_us?: string
    out_time_ms?: string
    out_time?: string
    dup_frames?: string
    drop_frames?: string
    progress?: string
  }
}

app.use(express.static(__dirname  + '/public'))
app.set('view engine', 'ejs')

app.get('/homepage', (req: Request, res: Response, next: NextFunction) => {
  res.render('index', { foo: 'Foo Value!!' })
})

app.get('/getFormats', async (req: Request, res: Response, next: NextFunction) => {
  const videoUrl = req.query.videoUrl?.toString()
  if (!videoUrl) return res.end('Please provide Youtube Url')

  const videoInfo = await ytdl.getInfo(videoUrl)

  const filteredVideosFormat = videoInfo.formats
    .map((el) => {
      if (el.container === 'mp4')
        /* return el */
        // {
        return {
          // url: el.url,
          mimeType: el.mimeType,
          // itag: el.itag,
          quality: el.quality,
          qualityLabel: el.qualityLabel,
          container: el.container,
          hasAudio: el.hasAudio,
          hasVideo: el.hasVideo
        }
      // }
    })
    .filter((el) => el && el.mimeType?.includes('video/mp4'))

  const arrayUniqueByKey = [...new Map(filteredVideosFormat.map((item) => [item!['qualityLabel'], item])).values()]

  console.log(filteredVideosFormat)

  res.send(arrayUniqueByKey)
})

app.get('/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const videoUrl = req.query.videoUrl?.toString()
    if (!videoUrl) return res.end('Please provide Youtube Url')
    console.log(videoUrl)

    const videoInfo = await ytdl.getInfo(videoUrl)

    console.log(videoInfo.videoDetails)

    const videoFileName = `${Math.floor(Math.random() * 100000)}.mp4`
    /* console.log('File is downloading')

  // const formats = ytdl.get
  // const video = ytdl(videoUrl, { filter: (format) => format.container === 'mp4' }).

  const filteredVideosFormat = videoInfo.formats.map((el) => {
    if (el.qualityLabel && el.hasAudio) {
      return {
        url: el.url,
        mimeType: el.mimeType,
        itag: el.itag,
        quality: el.quality,
        qualityLabel: el.qualityLabel,
        hasAudio: el.hasAudio,
        hasVideo: el.hasVideo
      }
    }
  })
  // const foundFormat = ytdl.chooseFormat(videoInfo.formats, { quality: '134' })

  const filteredVideo = filteredVideosFormat.filter((el) => el)
  ytdl(videoUrl, { format: videoInfo.formats[2] }).pipe(fs.createWriteStream('video.mp4'))
  console.log(filteredVideo)
  res.json({ filteredVideo }) */

    /* Merging Audio and Video using ffmpeg */
    const tracker: IReadStream = {
      start: Date.now(),
      audio: { downloaded: 0, total: Infinity },
      video: { downloaded: 0, total: Infinity },
      merged: { frame: '0', speed: '0x', fps: '0' }
    }

    /* Get Audio and Video Streams */
    const audioStream = ytdl(videoUrl, { quality: 'highestaudio' })
    // .on(
    //   'progress',
    //   (_: any, downloaded: any, total: any) => {
    //     // console.log('Inside Audio Stream')
    //     // console.log({ downloaded, total })
    //   }
    // )

    // const videoStream = ytdl(videoUrl, { format: videoInfo.formats[0] })
    const videoStream = ytdl(videoUrl, { quality: 'highestvideo' })
    // .on(
    //   'progress',
    //   (_: any, downloaded: any, total: any) => {
    //     // console.log('Inside Video Stream')
    //     // console.log({ downloaded, total })
    //   }
    // )

    /* ffmpeg child process */
    const ffmpegChildProcess = cp.spawn(
      ffmpeg!,
      [
        // Remove ffmpeg's console spamming
        '-loglevel',
        '8',
        '-hide_banner',
        // Redirect/Enable progress messages
        '-progress',
        'pipe:3',
        // Set inputs
        '-i',
        'pipe:4',
        '-i',
        'pipe:5',
        // Map audio & video from streams
        '-map',
        '0:a',
        '-map',
        '1:v',
        // Keep encoding
        '-c:v',
        'copy',
        // Define output file
        videoFileName
        // 'Shivoryx: Woh Raat.mp4'
      ],
      {
        windowsHide: false,
        stdio: [
          /* Standard: stdin, stdout, stderr */
          'inherit',
          'inherit',
          'inherit',
          /* Custom: pipe:3, pipe:4, pipe:5 */
          'pipe',
          'pipe',
          'pipe'
        ]
      }
    )

    ffmpegChildProcess.on('close', () => {
      console.log('Done')
      process.stdout.write('\n\n\n\n')
      // clearInterval(progressBarHandle)

      // res.setHeader('Content-Disposition', `attachment; filename: ${videoFileName}`)
      // fs.createReadStream(`./${videoFileName}`).pipe(res)
      res.attachment(`${videoInfo.videoDetails.title}.mp4`)
      fs.createReadStream(`./${videoFileName}`).pipe(res)

      fs.unlinkSync(videoFileName)

      // .end(() => {
      // fs.unlinkSync(videoFileName)
      // , (err) => {
      //   if (err) throw new Error(err.message)
      //   console.log('File Deleted!')
      // })
      // })
      // res.download(`./${videoFileName}`, videoFileName)

      /* Stream Download using GOT */
      // got()
      // got.stream().pipe(fs.createWriteStream('./18.mp4'))
    })

    /* Link Streams
     * ffmpeg creates the transformer streams and we just have to read or insert data
     */
    // ffmpegChildProcess.stdio[3]?.on('data', (chunk) => {
    //   /* Start the Progress Bar */
    //   // if (!progressbarHandle) progressbarHandle = setInterval(showProgress, progressbarInterval);
    //   // Parse the param=value list returned by ffmpeg
    //   const lines = chunk.toString().trim().split('\n')
    //   console.log(lines)
    //   const args: IReadStream['merged'] = {}
    //   type MergedKeys = keyof IReadStream['merged']
    //   for (const l of lines) {
    //     const [key, value] = l.split('=')
    //     const keyData = key.trim() as MergedKeys
    //     args[keyData] = value.trim()
    //   }

    //   tracker.merged = arg
    // })

    audioStream.pipe(ffmpegChildProcess.stdio[4] as NodeJS.WritableStream)
    // @ts-ignore
    videoStream.pipe(ffmpegChildProcess.stdio[5] as NodeJS.WritableStream)
  } catch (error) {
    console.log('Error occured!!', error)
  }
})

app.listen(8000, () => console.log('Server is listening on port 8000'))
