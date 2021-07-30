import { ref, watch } from 'vue'
import { useStore } from "vuex"
import gremlinApi, * as gremlinUtils from "@/composables/api/gremlin-api"
import * as gremlinManager from "@/composables/gremlinManager"
import * as targetPatternPieceManager from "@/composables/targetPatternPieceManager"

const morphologyInfoType = Object.freeze({
    pos: {
        name: 'pos'
        , propertyInWord: 'tag'
    }
    , lemma: {
        name: 'lemma'
        , propertyInWord: 'lemma'
    }
})


export default function() {
    
    const store = useStore()
    const spacyFormatSentences = ref([])
    const toggleMorphologySelection = (morphInfoType, tokenIndex) => {
        const sentence = currentSentence()
        const selectedArcs = sentence.arcs.filter( arc => arc.selected)
        if (selectedArcs.length > 0) { // 如果有選 dependency
            if (selectedArcs.filter( (selectedArc) => { // 選起來的 dependency 又都沒有連著現在要選的 token
                return (selectedArc.trueStart === tokenIndex || selectedArc.trueEnd === tokenIndex)
            }).length <= 0) return // 就不要選取
        }
        // TODO 選取還是都要連起來比較保險
        // 執行 toggle
        // TODO PROGRESS POS 固定要選起來，選了其他的，要自動標記 POS 有選
        const word = sentence.words[tokenIndex]
        if (word.selectedMorphologyInfoTypes.includes(morphInfoType)) { // toggle off
            word.selectedMorphologyInfoTypes.splice(word.selectedMorphologyInfoTypes.indexOf(morphInfoType, 1))
            word.sourcePatternVertexId = undefined
            const beginWord = findBeginWord()
            if (beginWord != undefined && beginWord.indexInSentence === tokenIndex) {
                selectedSourcePattern.value = {}
                selectedTargetPattern.value= {}
                sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
                targetPatternOptions.value.splice(0, targetPatternOptions.value.length)
                word.isBeginning = false
            }
        } else { // toggle on
            word.selectedMorphologyInfoTypes.push(morphInfoType)
            if (findBeginWord() === undefined) {
                word.isBeginning = true
            }
            // TODO PROGRESS POS 固定要選起來，選了其他的，要自動標記 POS 有選，這裡做反向控制
        }
        reloadMatchingSourcePatternOptions()
        findExistingMatchSourcePatternAndMark()
    }
    const toggleDependencySelection = (dependencyIndex) => {
        const dependency = currentSentence().arcs[dependencyIndex]
        if (dependency.selected || dependency.sourcePatternEdgeId) {
            dependency.selected = undefined
            selectedSourcePattern.value = {}
        } else {
            dependency.selected = !dependency.selected
        }
        reloadMatchingSourcePatternOptions()
        findExistingMatchSourcePatternAndMark()
    }
    const findExistingMatchSourcePatternAndMark = () => {
        if (!findBeginWord()) return
        const selectedArcsFromBegin = currentSentence().arcs.filter( (arc) => {
            return (arc.selected && arc.trueStart === findBeginWord().indexInSentence)
        })
        if (selectedArcsFromBegin.length === 0) return
        let gremlinInvoke = new gremlinUtils.GremlinInvoke()
        .call("V")
        const beginWord = findBeginWord()
        beginWord.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
            gremlinInvoke = gremlinInvoke.call("has", morphInfoType.name, beginWord[morphInfoType.propertyInWord])
        })
        gremlinInvoke = gremlinInvoke.nest(
            "where"
            , new gremlinUtils.GremlinInvoke(true)
            .call("outE")
            .call("count")
            .call("is", selectedArcsFromBegin.length)
            .command
        )
        const arcSum = new Map();
        selectedArcsFromBegin.forEach( (selectedArc) => {
            if ( arcSum.has(selectedArc.label) ) {
                arcSum.set(selectedArc.label, arcSum.get(selectedArc.label) + 1)
            } else {
                arcSum.set(selectedArc.label, 1)
            }
        })
        arcSum.forEach( (value, key) => {
            gremlinInvoke = gremlinInvoke.nest("and"
                , new gremlinUtils.GremlinInvoke(true)
                .call("outE", key)
                .call("count")
                .call("is", value)
                .command
            )
        })
        // TODO 到這裡只完成第一層的 edge 判斷，還有後續的 vertex 和 edge 要查
        const gremlinCommand = gremlinInvoke.command
        console.log(gremlinCommand)
        gremlinApi(gremlinCommand).then( (resultData) => {
            if (resultData['@value'].length === 0) {
                return
            }
            if (resultData['@value'].length > 1) {
                const error = "資料庫存的 pattern 重覆"
                console.error(error, resultData)
                throw error
            }
            const sourcePatternBeginningId = resultData['@value'][0]['@value'].id['@value']
            setSelectedSourcePatternDropdownValue(sourcePatternBeginningId)
        })
    }

    const selectedSourcePattern = ref({})
    const sourcePatternOptions = ref([])
    const reloadMatchingSourcePatternOptions = () => {
        sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
        const beginWord = findBeginWord()
        if (! beginWord) {
            return
        }
        let gremlinCommand = new gremlinUtils.GremlinInvoke().call("V")
        beginWord.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
            gremlinCommand = gremlinCommand.call("has", morphInfoType.name, beginWord[morphInfoType.propertyInWord])
        })
        gremlinCommand = gremlinCommand.call("inE", 'applicable')
        .call("inV")
        .call("dedup")
        .command
        return new Promise((resolve, reject) => {
            gremlinApi(gremlinCommand).then( (resultData) => {
                resultData['@value'].forEach( (sourcePatternBeginning) => {
                    sourcePatternOptions.value.push({
                        id: sourcePatternBeginning['@value'].id['@value']
                        , label: sourcePatternBeginning['@value'].label + '-' + sourcePatternBeginning['@value'].id['@value']
                    })
                })
                resolve(resultData)
            }).catch ( function(error) {
                console.error(error)
                reject(error)
            })
        })
    }

    watch(selectedSourcePattern, (newValue, oldValue) => {
        console.log('watching selected source pattern change: ', newValue, oldValue)
        if (newValue == undefined || newValue.id == undefined) {
            clearSelectionAndMatchingAndOptions()
            return
        }
        const currentBeginWord = findBeginWord()
        if (currentBeginWord == undefined) return
        
        const sourcePatternBeginningId = newValue.id
        currentBeginWord.sourcePatternVertexId = sourcePatternBeginningId
        // 處理 target pattern
        selectedTargetPattern.value = {}
        reloadTargetPatternOptions(sourcePatternBeginningId).then( () => {
            gremlinApi(
                new gremlinUtils.GremlinInvoke()
                .call('V', sourcePatternBeginningId)
                .call('in', gremlinManager.edgeLabels.applicable)
                .command
            )
            .then((resultData) => {
                console.log(resultData)
                // const targetPatternBeginnningVertexId = resultData['@value'][0]['@value'].id['@value']
                // console.log('Target Pattern Beginning Vertex Id: ', targetPatternBeginnningVertexId)
                // setSelectedTargetPatternDropdownValue(targetPatternBeginnningVertexId)
            })
        })

        autoMarkMatchingPattern(sourcePatternBeginningId)
    })

    const selectedTargetPattern = ref({})
    const targetPatternOptions = ref([])
    const clearSelectionAndMatchingAndOptions = () => {
        const sentence = currentSentence()
        sentence.arcs.forEach( arc => arc.sourcePatternEdgeId = undefined)
        sentence.arcs.forEach( arc => arc.selected = false)
        sentence.words.forEach( (word) => {
            word.selectedMorphologyInfoTypes.splice(0, word.selectedMorphologyInfoTypes.length)
            word.isBeginning = false
            word.sourcePatternVertexId = undefined
        })
        sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
        targetPatternOptions.value.splice(0, targetPatternOptions.value.length)
    }
    const reloadTargetPatternOptions = (sourcePatternBeginningId) => {
        targetPatternOptions.value.splice(0, targetPatternOptions.value.length)

        const gremlinCommand = new gremlinUtils.GremlinInvoke()
        .call("V", sourcePatternBeginningId)
        .call("in", "applicable")
        .command
        return new Promise( (resolve, reject) => {
            gremlinApi(gremlinCommand).then( (resultData) => {
                resultData['@value'].forEach( (targetPatternBeginning) => {
                    targetPatternOptions.value.push({
                        id: targetPatternBeginning['@value'].id['@value'] 
                        , label: targetPatternBeginning['@value'].label + '-' + targetPatternBeginning['@value'].id['@value']
                    })
                })
                resolve(resultData)
            }).catch( (error) => {
                reject(error)
            })
        })
    }
    const setSelectedSourcePatternDropdownValue = (id) => {
        selectedSourcePattern.value = sourcePatternOptions.value.find( (option) => {
            return option.id == id
        })
    }
    // const setSelectedTargetPatternDropdownValue = (id) => {
    //     selectedTargetPattern.value = targetPatternOptions.value.find( (option) => {
    //         return option.id == id
    //     })
    //     console.log(selectedTargetPattern.value)
    // }
    const autoMarkMatchingPattern = (sourcePatternBeginningId) => {
        setSelectedSourcePatternDropdownValue(sourcePatternBeginningId)
        // 這裡必須要用 ==，因為 Primevue 的值是存 null，不是存 undefined
        if (selectedSourcePattern.value == undefined || selectedSourcePattern.value.id == undefined) {
            setSelectedSourcePatternDropdownValue(sourcePatternBeginningId)
        }
        let gremlinCommand = new gremlinUtils.GremlinInvoke()
        .call("V", sourcePatternBeginningId)
        .nest("repeat", new gremlinUtils.GremlinInvoke(true).call("outE").call("inV").command)
        .nest("until", new gremlinUtils.GremlinInvoke(true).call("outE").call("count").call("is", 0).command)
        .call("limit", 20)
        .call("path")
        .command
        gremlinApi(gremlinCommand).then( (resultData) => {
            findBeginWord().sourcePatternVertexId = sourcePatternBeginningId
            resultData['@value'].forEach( (path) => {
                const outVId = path['@value'].objects['@value'][0]['@value'].id['@value']
                const outELabel = path['@value'].objects['@value'][1]['@value'].label
                const outEId = path['@value'].objects['@value'][1]['@value'].id['@value'].relationId
                const sentence = currentSentence()
                const matchingArc = sentence.arcs.find( (arc) => {
                    return (
                        sentence.words[arc.trueStart].sourcePatternVertexId === outVId
                        && arc.label === outELabel
                    )
                })
                matchingArc.sourcePatternEdgeId = outEId
            })
        })
    }

    const currentSentence = () => {
        return spacyFormatSentences.value[store.getters.currentSentenceIndex]
    }
    const findBeginWord = () => {
        const beginWords = currentSentence().words.filter( (word) => {
            return word.isBeginning
        })
        if (beginWords.length <= 0) return undefined
        if (beginWords.length > 1) {
            const error = "begin word 超過一個，程式控制有問題"
            console.error(error)
            throw error
        }
        return beginWords[0]
    }

    const saveSelectedPattern = (selectedWords, selectedArcs, segmentPieces) => {
        let gremlinInvoke = new gremlinUtils.GremlinInvoke()

        // TODO 判斷現在的 pattern 是不是既有的，是的話就不要再存
        gremlinInvoke = processSelectedNewSourcePatternStoring(selectedWords, selectedArcs, gremlinInvoke)
        gremlinInvoke = targetPatternPieceManager.processTargetPatternStoring(segmentPieces, gremlinInvoke)
        gremlinInvoke.call("select", gremlinManager.aliases.sourcePatternBeginning)

        console.log(gremlinInvoke.command)
        gremlinApi(gremlinInvoke.command)
        .then((resultData) => {
            const sourcePatternBeginningVertexId = resultData['@value'][0]['@value'].id['@value']
            console.log('Source Pattern Begin Vertex Id: ', sourcePatternBeginningVertexId)
            reloadMatchingSourcePatternOptions().then(() => {
                setSelectedSourcePatternDropdownValue(sourcePatternBeginningVertexId)
            })
            return sourcePatternBeginningVertexId
        }).catch(function(error) {
            console.error(error)
        })
    }
    const processSelectedNewSourcePatternStoring = (selectedWords, selectedArcs, gremlinInvoke) => {
        if (selectedSourcePattern.value != undefined && selectedSourcePattern.value.id != undefined) {
            gremlinInvoke = gremlinInvoke
            .call("V", selectedSourcePattern.value.id)
            .call("as", gremlinManager.aliases.sourcePatternBeginning)
            return gremlinInvoke
        }
        selectedWords.forEach( (word) => {
            gremlinInvoke = gremlinInvoke
                .call("addV", gremlinManager.vertexLabels.sourcePattern)
            word.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
                gremlinInvoke = gremlinInvoke.call("property", morphInfoType.name, word[morphInfoType.propertyInWord])
            })
            gremlinInvoke = gremlinInvoke.call("as", gremlinManager.vertexAlias(word))
            if (word.isBeginning) {
                gremlinInvoke = gremlinInvoke
                .call("as", gremlinManager.aliases.sourcePatternBeginning)
                .call("property", "isBeginning", true)
                .call("property", "owner", "Chin")
            }
        })
        selectedArcs.forEach( (arc) => {
            const startWord = selectedWords.find( word => word.indexInSentence == arc.trueStart )
            if (startWord === undefined
                || startWord.selectedMorphologyInfoTypes.length === 0
                ) {
                    const error = "dependency 起點沒被選取"
                    console.error(error)
                    throw error
                }
            let startVName = gremlinManager.vertexAlias(startWord)
            let endVName = undefined
            if (arc.isPlaceholder) { // 這個 dependency 後面連著連接處
                const connectorVName = gremlinManager.connectorAlias(arc)
                endVName = connectorVName
                gremlinInvoke = gremlinInvoke
                .call("addV", gremlinManager.vertexLabels.sourcePattern)
                .call("property", gremlinManager.propertyNames.isConnector, true)
                .call("as", connectorVName)
            } else {
                const endWord = selectedWords.find( word => word.indexInSentence == arc.trueEnd ) 
                endVName = gremlinManager.vertexAlias(endWord)
            }
            gremlinInvoke = gremlinInvoke
            .call("addE", arc.label)
            .call("from", startVName)
            .call("to", endVName)
        })
        return gremlinInvoke
    }
    return {
        spacyFormatSentences: spacyFormatSentences.value
        , toggleMorphologySelection
        , morphologyInfoType
        , toggleDependencySelection
        , sourcePattern: {
            selected: selectedSourcePattern
            , options: sourcePatternOptions.value
        }
        , targetPattern: {
            selected: selectedTargetPattern
            , options: targetPatternOptions.value
        }
        , patternHelper: {
            saveSelectedPattern: saveSelectedPattern
        }
    }
}
