// Turns one rendered screenshot into a short silent MP4, the way the one-image iMessage accounts doing
// millions post them (@36grm, @unicornsprinklewaffles, @richie_prince1, read 14 Oct 2026): every one of
// their big posts is a still uploaded as a 9 to 15 second video, with the sound added in TikTok. A still
// video loops while people read it, and a photo post does not.
//   xcrun swift scripts/tiktok-still-video.swift docs/marketing/tiktok-510/slide-01.png docs/marketing/tiktok-510/post.mp4 [seconds]
//
// 1080×1920 at 30 fps, H.264, the picture fitted to the width and centred on black: what TikTok would
// draw around a photo anyway, so nothing about the frame looks made.
import AVFoundation
import CoreGraphics
import Foundation
import ImageIO

let args = CommandLine.arguments
guard args.count >= 3 else {
  print("usage: xcrun swift scripts/tiktok-still-video.swift <in.png> <out.mp4> [seconds]")
  exit(1)
}
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
let seconds = args.count > 3 ? Double(args[3]) ?? 10 : 10
let width = 1080
let height = 1920
let fps: Int32 = 30

guard let source = CGImageSourceCreateWithURL(input as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
  fatalError("cannot read \(input.path)")
}

try? FileManager.default.removeItem(at: output)
let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: width,
  AVVideoHeightKey: height,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: 4_000_000,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
  ],
])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: writerInput, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
  kCVPixelBufferWidthKey as String: width,
  kCVPixelBufferHeightKey as String: height,
])
writer.add(writerInput)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

// The frame never changes, so it is drawn once and the same buffer is appended for every frame.
var made: CVPixelBuffer?
CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32ARGB,
                    [kCVPixelBufferCGImageCompatibilityKey: true, kCVPixelBufferCGBitmapContextCompatibilityKey: true] as CFDictionary, &made)
guard let frame = made else { fatalError("cannot make a frame buffer") }
CVPixelBufferLockBaseAddress(frame, [])
guard let context = CGContext(data: CVPixelBufferGetBaseAddress(frame), width: width, height: height, bitsPerComponent: 8,
                              bytesPerRow: CVPixelBufferGetBytesPerRow(frame), space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue) else { fatalError("cannot draw the frame") }
context.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: 1))
context.fill(CGRect(x: 0, y: 0, width: width, height: height))
let scale = min(Double(width) / Double(image.width), Double(height) / Double(image.height))
let drawn = CGSize(width: Double(image.width) * scale, height: Double(image.height) * scale)
context.interpolationQuality = .high
context.draw(image, in: CGRect(x: (Double(width) - drawn.width) / 2, y: (Double(height) - drawn.height) / 2, width: drawn.width, height: drawn.height))
CVPixelBufferUnlockBaseAddress(frame, [])

for i in 0..<Int(seconds * Double(fps)) {
  while !writerInput.isReadyForMoreMediaData { usleep(1000) }
  adaptor.append(frame, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: fps))
}
writerInput.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
guard writer.status == .completed else { fatalError("could not write \(output.path): \(String(describing: writer.error))") }
print("wrote", output.path)
