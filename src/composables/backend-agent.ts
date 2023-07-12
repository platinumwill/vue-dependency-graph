const apigClientFactory = require('aws-api-gateway-client').default;

const config = {
    invokeUrl: 'https://' + process.env.VUE_APP_AWS_API_INVOKE_URL
    , region: process.env.VUE_APP_AWS_REGION
    , accessKey: process.env.VUE_APP_AWS_ACCESSKEY
    , secretKey: process.env.VUE_APP_AWS_SECRETKEY
}
const apigClient = apigClientFactory.newClient(config)
console.log('apigclient', apigClient)

const pathParams = {}
const pathTemaplte = ''
const method = 'POST'
const additionalParams = {}
// https://jqjs9epd00.execute-api.ap-southeast-1.amazonaws.com/prod
export async function queryExistingDocument(documentId: number|undefined, documentText: string|undefined) {
    console.log('function, apigclientFactory', apigClientFactory)
    const document = {
        id: documentId
        , content: documentText
    }
    const body = {
        document: document
    }
    const documentQueryResult = await apigClient.invokeApi(pathParams, pathTemaplte, method, additionalParams, body)
        .then(function(response: any){
            return response.data
        }).catch( function(result: string){
            console.log('api exception', result)
            throw new Error(result)
        })

    return documentQueryResult
}
