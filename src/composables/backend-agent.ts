const apigClientFactory = require('aws-api-gateway-client').default;

const config = {
    invokeUrl: 'https://e0ztjs5kx3.execute-api.ap-southeast-1.amazonaws.com/prod/graph'
    , region: 'ap-southeast-1'
    , accessKey: 'AKIA2HKHFIQIKO6UFHUH'
    , secretKey: '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'

}
const apigClient = apigClientFactory.newClient(config)
console.log('apigclient', apigClient)

const pathParams = {}
const pathTemaplte = ''
const method = 'POST'
const additionalParams = {}
// https://jqjs9epd00.execute-api.ap-southeast-1.amazonaws.com/prod
export function queryExistingDocument(documentId: number|undefined, documentText: string|undefined) {
    console.log('function, apigclientFactory', apigClientFactory)
    const document = {
        id: documentId
        , content: documentText
    }
    const body = {
        document: document
    }

    apigClient.invokeApi(pathParams, pathTemaplte, method, additionalParams, body)
        .then(function(result: string){
            console.log('api result', result)
            //This is where you would put a success callback
        }).catch( function(result: string){
            console.log('api exception', result)
            //This is where you would put an error callback
        });
}
