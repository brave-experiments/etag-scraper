const onResponse = async (collection, logger, response) => {
  const request = response.request()
  const requestMethod = request.method()
  const requestUrl = request.url()
  logger.write(`Received response to: ${requestMethod} - ${requestUrl}\n`)

  const requestType = request.resourceType()

  const responseHeaders = response.headers()
  const responseEtag = responseHeaders.etag || null
  const responseStatus = response.status()

  const frame = await response.frame()
  const frameUrl = frame ? frame.url() : undefined

  let size
  try {
    size = (await response.buffer()).length
  } catch (e) {
    size = -1
    logger.write(`Caught error for request: ${requestUrl}\n`)
    logger.write(String(e) + '\n')
  }

  collection.push({
    method: requestMethod,
    requestUrl: requestUrl,
    type: requestType,
    etag: responseEtag,
    frameUrl: frameUrl,
    size: size,
    status: responseStatus,
    timestamp: Date.now()
  })
}

module.exports = {
  onResponse
}
