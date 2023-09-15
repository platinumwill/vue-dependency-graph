import { ModifiedSpacyDependency, ModifiedSpacyElement, ModifiedSpacyToken } from "@/composables/sentenceManager";
import { Ref, ref } from 'vue'
import { GremlinInvoke, aliases, vertexAlias, vertexLabels, propertyNames, connectorAlias, edgeLabels, submit } from "@/composables/gremlinManager";
import * as backendAgent from "@/composables/backend-agent"

export class SourcePatternOption {
    id: number
    dropdownOptionLabel: string

    constructor(id: number, dropdownOptionLabel: string) {
        this.id = id
        this.dropdownOptionLabel = dropdownOptionLabel
    }
}

export function prepareSegment(token: ModifiedSpacyToken) {
    const selectedSourcePattern = ref<SourcePatternOption | undefined>(undefined)
    const sourcePatternOptions = ref<SourcePatternOption[]>([])
    
// TODO convert to aws = done
    const processSelectedSourcePatternStoring = async (gremlinInvoke: GremlinInvoke) => {
        // 如果 source pattern 下拉選單已經有值（表示資料庫裡已經有目前選取的 source pattern），就不必儲存 source pattern
        if (selectedSourcePattern.value != undefined && selectedSourcePattern.value.id != undefined) {
            gremlinInvoke = gremlinInvoke
            .call("V", selectedSourcePattern.value.id)
            .call("as", aliases.sourcePatternBeginning)
            return gremlinInvoke
        }
        const elements: ModifiedSpacyElement[] = []
        elements.push(...token.segmentTokens)
        elements.push(...token.segmentDeps)
        // token 和 dependency 拼在一起是為了要順序的資料
        // 2023.7.31: 不確定上面這個處理還有沒有需要
        elements.sort( (e1, e2) => { return e1.indexInSentence - e2.indexInSentence})
        console.log('elements', elements)
        const sourcePatternArray:any[] = []
        elements.forEach( (ele, index) => {
            if (! (ele instanceof ModifiedSpacyToken)) return

            console.log('token index in sentence', ele.indexInSentence)

            const word = ele
            // TODO convert to aws
            gremlinInvoke.call("addV", vertexLabels.sourcePattern)
            gremlinInvoke.property(propertyNames.seqNo, index + 1)


            // for aws
            const sourcePatternPiece: any = backendAgent.generateTokenForAWS(word, index);
            sourcePatternArray.push(sourcePatternPiece)
            word.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
                gremlinInvoke = gremlinInvoke.call("property", morphInfoType.name, word[morphInfoType.propertyInWord])
            })
            console.log('SOURCE PATTERN', sourcePatternArray)

            gremlinInvoke.as(vertexAlias(word))
            if (word.isBeginning) {
                gremlinInvoke = gremlinInvoke
                .as(aliases.sourcePatternBeginning)
                // TODO 這一行不確定還需不需要
                .property("isBeginning", true)
                .property("owner", "Chin")
            }
        })

        const sourcePatternDependencyArray:any[] = []
        elements.forEach( (ele, index) => {
            if (! (ele instanceof ModifiedSpacyDependency)) return
            console.log('depen index in sentence', ele.indexInSentence)

            const arc = ele
            // TODO convert to aws
            // 目前因為要用最小單位做組合單位，所以 dependency 的 startWord 一定是當下選取的起點 token
            const startWord = token
            if (startWord === undefined
                || startWord.selectedMorphologyInfoTypes.length === 0
                ) {
                    const error = "dependency 起點沒被選取"
                    console.error(error)
                    throw error
                }
            const startVName = vertexAlias(startWord)
            let endVName = undefined
            if (arc.isPlaceholder) { // 這個 dependency 後面連著連接處 (=假想的連接對象），也就是沒有連著 token
                const connectorVName = connectorAlias(arc)
                endVName = connectorVName
                // TODO convert to aws
                gremlinInvoke = gremlinInvoke
                .addV(vertexLabels.sourcePattern)
                .property(propertyNames.isConnector, true)
                .as(connectorVName)
            } else { // 不是 placeholder ，也就是連接著 token
                endVName = vertexAlias(arc.selectedEndToken)
            }

            // TODO convert to aws
            gremlinInvoke = gremlinInvoke
            .call("addE", arc.label)
            .call("from", startVName)
            .call("to", endVName)
            .property(propertyNames.seqNo, index + 1)

            const seqNo: number = index + 1

            // aws
            const sourcePatternDependency: any = backendAgent.generateDependencyForAWS(arc, seqNo);
            sourcePatternDependencyArray.push(sourcePatternDependency)
        })

        await backendAgent.setSourcePattern(sourcePatternArray, sourcePatternDependencyArray).then( async (result:any) => {
            console.log('saveNewPattern result', result)
        })
        return gremlinInvoke
    }

    const reloadOptions = () => {
        return _reloadMatchingSourcePatternOptions(sourcePatternOptions, token)
    }

    const clearOptions = () => {
        sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
    }

    const setSelectedSourcePatternDropdownValue = (id: any) => {
        selectedSourcePattern.value = sourcePatternOptions.value.find( (option) => {
            return option.id == id
        })
    }

    function isSourcePatternNew() {
        return selectedSourcePattern.value == undefined
    }

    return {
        selection: {
            selectedPattern: selectedSourcePattern
            , options: sourcePatternOptions
            , reloadOptions: reloadOptions
            , setAsSelected: setSelectedSourcePatternDropdownValue
            , clearOptions: clearOptions
        }
        , process: {
            save: processSelectedSourcePatternStoring
        }
        , status: {
            isSourcePatternNew: isSourcePatternNew
        }
    }
}

// TODO convert to aws = done
const _reloadMatchingSourcePatternOptions = async (
    sourcePatternOptions: Ref<SourcePatternOption[]>
    , beginWord: ModifiedSpacyToken) => {

    sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
    if (! beginWord) {
        return new Promise( (resolve) => {
            resolve(undefined)
        })
    }

// TODO convert to aws = done
    let gremlinCommand = new GremlinInvoke().call("V")
    beginWord.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
        gremlinCommand = gremlinCommand.call("has", morphInfoType.name, beginWord[morphInfoType.propertyInWord])
    })
    gremlinCommand = gremlinCommand.call("inE", edgeLabels.applicable)
    .call("inV")
    .call("dedup")
    // return new Promise((resolve, reject) => {
        const awsBeginToken = backendAgent.generateTokenForAWS(beginWord)
        return await backendAgent.querySourcePattern(awsBeginToken).then( async (result:any) => {
            console.log('AWS source pattern result', result)
            await result.forEach( async (sourcePattern:any) => {
                sourcePatternOptions.value.push({
                    id: sourcePattern.id
                    , dropdownOptionLabel: sourcePattern.label + '-' + sourcePattern.id
                })
            })
            return result
        })
        return await submit(gremlinCommand).then( (resultData: any) => { // 回傳的資料裡面需要用到的是 id 和 label
            resultData['@value'].forEach( (sourcePatternBeginning: any) => {
                sourcePatternOptions.value.push({
                    id: sourcePatternBeginning['@value'].id['@value']
                    , dropdownOptionLabel: sourcePatternBeginning['@value'].label + '-' + sourcePatternBeginning['@value'].id['@value']
                })
            })

            return resultData
            // resolve(resultData)
        })
        // }).catch ( function(error) {
        //     console.error(error)
        //     reject(error)
        // })
    // })
}
