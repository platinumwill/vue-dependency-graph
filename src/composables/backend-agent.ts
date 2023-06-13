const apigClientFactory = require('aws-api-gateway-client').default;

const config = {
    invokeUrl: 'https://jqjs9epd00.execute-api.ap-southeast-1.amazonaws.com/prod/graph'
    , region: 'ap-southeast-1'
    , accessKey: 'AKIA2HKHFIQIKO6UFHUH'
    , secretKey: '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'

}
const apigClient = apigClientFactory.newClient(config)
console.log('apigclient', apigClient)

const pathParams = {}
const pathTemaplte = ''
const method = 'GET'
const additionalParams = {}
const body = {}
apigClient.invokeApi(pathParams, pathTemaplte, method, additionalParams, body)
    .then(function(result: string){
        console.log('api result', result)
        //This is where you would put a success callback
    }).catch( function(result: string){
        console.log('api exception', result)
        //This is where you would put an error callback
    });

// https://jqjs9epd00.execute-api.ap-southeast-1.amazonaws.com/prod
export function xxxx() {
    console.log('function, apigclientFactory', apigClientFactory)
}
