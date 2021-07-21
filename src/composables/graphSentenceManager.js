import { ref, watch } from 'vue'
import { useStore } from "vuex"
import gremlinApi, * as gremlinUtils from "@/composables/api/gremlin-api"

const morphologyInfoType = Object.freeze({
    pos: 'POS'
    , lemma: 'Lemma'
})
// const vertextType = Object.freeze({
//     connector: 'Connector'
// })
const vertexLabels = Object.freeze({
    targetPattern: "SimpleTargetPatternPiece"
})
const edgeLabels = Object.freeze({
    applicable: 'applicable'
    , follows: 'follows'
})
const aliases = Object.freeze({
    sourcePatternBeginning: "sourcePatternBeginning"
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
        const word = sentence.words[tokenIndex]
        if (word.selectedMorphologyInfoType === morphInfoType) { // toggle off
            word.selectedMorphologyInfoType = undefined
            word.beginningMorphologyInfoType = undefined
            word.sourcePatternVertexId = undefined
            if (findBeginWord.indexInSentence === tokenIndex) {
                sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
                targetPatternOptions.value.splice(0, targetPatternOptions.value.length)
            }
        } else { // toggle on
            word.selectedMorphologyInfoType = morphInfoType
        }
        updateBeginning()
        reloadMatchingSourcePatternOptions()
        findExistingMatchPatternAndMark()
    }
    const toggleDependencySelection = (dependencyIndex) => {
        const dependency = currentSentence().arcs[dependencyIndex]
        if (dependency.selected || dependency.sourcePatternEdgeId) {
            dependency.selected = undefined
            currentSentence().arcs.forEach( arc => arc.sourcePatternEdgeId = undefined)
            currentSentence().words.forEach( word => word.sourcePatternVertexId = undefined)
            selectedSourcePattern.value = {}
        } else {
            dependency.selected = !dependency.selected
        }
        updateBeginning()
        reloadMatchingSourcePatternOptions()
        findExistingMatchPatternAndMark()
    }
    const updateBeginning = () => {
        currentSentence().words.forEach( (word) => {
            selectedArcs().forEach( (arc) => {
                if (arc.trueEnd === word.indexInSentence) { // 在 edge 尾巴的標成不是 begin
                    word.beginningMorphologyInfoType = undefined
                    return
                }
            })
            if (findBeginWord()) return
            word.beginningMorphologyInfoType = word.selectedMorphologyInfoType
        })
        if (! findBeginWord()) return
        if (findBeginWord().length > 1) { // 如果 begin word 超過 1 個
            currentSentence().words.forEach( (word) => {
                word.beginningMorphologyInfoType = undefined
                word.selectedMorphologyInfoType = undefined
                word.sourcePatternVertexId = undefined
            })
        }
    }

    const findExistingMatchPatternAndMark = () => {
        if (!findBeginWord()) return
        const selectedArcsFromBegin = currentSentence().arcs.filter( (arc) => {
            return (arc.selected && arc.trueStart === findBeginWord().indexInSentence)
        })
        if (selectedArcsFromBegin.length === 0) return
        let gremlinInvoke = new gremlinUtils.GremlinInvoke()
        .call("V")
        .call("has", findBeginWord().selectedMorphologyInfoType, findBeginWord().tag)
        .nest(
            "where"
            , new gremlinUtils.GremlinInvoke(true)
            .call("outE")
            .call("count")
            .call("is", selectedArcsFromBegin.length)
            .command
        )
        const arcSum = new Map();
        selectedArcsFromBegin.forEach( (selectedArc) => {
            console.log("label: ", selectedArc.label)
            if ( arcSum.has(selectedArc.label) ) {
                arcSum.set(selectedArc.label, arcSum.get(selectedArc.label) + 1)
            } else {
                arcSum.set(selectedArc.label, 1)
            }
            // gremlinInvoke = gremlinInvoke.command("and", new gremlin)
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
        const gremlinCommand = new gremlinUtils.GremlinInvoke()
        .call("V")
        .call("has", beginWord.beginningMorphologyInfoType, beginWord.tag)
        .call("inE", 'applicable')
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
        console.log('selected source pattern changed: ', newValue, oldValue)
        if (newValue == undefined || newValue.id == undefined) {
            clearSelectionAndMatchingAndOptions()
            return
        }
        const sourcePatternBeginningId = newValue.id
        const currentBeginWord = findBeginWord()
        currentBeginWord.sourcePatternVertexId = sourcePatternBeginningId

        // clear

        // 處理 target pattern
        selectedTargetPattern.value = {}
        reloadTargetPatternOptions(sourcePatternBeginningId)

        autoMarkMatchingPattern(sourcePatternBeginningId)
    })

    const selectedTargetPattern = ref({})
    const targetPatternOptions = ref([])
    const clearSelectionAndMatchingAndOptions = () => {
        const sentence = currentSentence()
        sentence.arcs.forEach( arc => arc.sourcePatternEdgeId = undefined)
        sentence.arcs.forEach( arc => arc.selected = false)
        sentence.words.forEach( (word) => {
            word.selectedMorphologyInfoType = undefined
            word.beginningMorphologyInfoType = undefined
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
        gremlinApi(gremlinCommand).then( (resultData) => {
            resultData['@value'].forEach( (targetPatternBeginning) => {
                targetPatternOptions.value.push({
                    id: targetPatternBeginning['@value'].id['@value'] 
                    , label: targetPatternBeginning['@value'].label + '-' + targetPatternBeginning['@value'].id['@value']
                })
            })
        })
    }
    const setSelectedSourcePatternDropdownValue = (id) => {
        selectedSourcePattern.value = sourcePatternOptions.value.find( (option) => {
            return option.id == id
        })
    }
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
                const outEId = path['@value'].objects['@value'][1]['@value'].id['@value']
                // const inVLabel = path['@value'].objects[2].label
                // const beginWordIndex = beginWord().indexInSentence
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
    const selectedArcs = () => {
        return currentSentence().arcs.filter( (arc) => {
            return arc.selected
        })
    }
    const findBeginWord = () => {
        const beginWords = currentSentence().words.filter( (word) => {
            return word.beginningMorphologyInfoType !== undefined
        })
        if (beginWords.length <= 0) return undefined
        if (beginWords.length > 1) {
            const error = "begin word 超過一個，程式控制有問題"
            console.error(error)
            throw error
        }
        return beginWords[0]
    }

    const isDependencyPlaceholder = (arc, selectedWords) => {
        const startConnected = (selectedWords.find( word => word.indexInSentence == arc.trueStart) !== undefined)
        const endConnected = (selectedWords.find( word => word.indexInSentence == arc.trueEnd) !== undefined)
        if (startConnected && !endConnected) {
            return true
        }
        return false
    }

    const saveSelectedPattern = (selectedWords, selectedArcs, segmentPieces) => {
        let gremlinInvoke = new gremlinUtils.GremlinInvoke()

        // TODO 判斷現在的 pattern 是不是既有的，是的話就不要再存
        gremlinInvoke = processSelectedNewSourcePatternStoring(selectedWords, selectedArcs, gremlinInvoke)
        gremlinInvoke = processTargetPatternStoring(segmentPieces, gremlinInvoke)

        console.log(gremlinInvoke.command)
        gremlinApi(gremlinInvoke.command)
        .then((resultData) => {
            const sourcePatternBeginningVertexId = resultData['@value'][0]['@value'].id['@value']
            console.log('Source Pattern Begin Vertex Id: ', sourcePatternBeginningVertexId)
            findExistingMatchPatternAndMark()
            reloadMatchingSourcePatternOptions().then(() => {
                setSelectedSourcePatternDropdownValue(sourcePatternBeginningVertexId)
            })
            return sourcePatternBeginningVertexId
        }).then((sourcePatternBeginningVertexId) => {
            gremlinApi(
                new gremlinUtils.GremlinInvoke()
                .call('V', sourcePatternBeginningVertexId)
                .call('in', edgeLabels.applicable)
                .command
            )
            .then((resultData) => {
                const targetPatternBeginnningVertexId = resultData['@value'][0]['@value'].id['@value']
                console.log(targetPatternBeginnningVertexId)
            })
        }).catch(function(error) {
            console.log(error)
        })
    }
    const processSelectedNewSourcePatternStoring = (selectedWords, selectedArcs, gremlinInvoke) => {
        function vertexAlias(word) {
            return word.selectedMorphologyInfoType + word.indexInSentence
        }
        if (selectedSourcePattern.value != undefined && selectedSourcePattern.value.id != undefined) {
            gremlinInvoke = gremlinInvoke
            .call("V", selectedSourcePattern.value.id)
            .call("as", aliases.sourcePatternBeginning)
            return gremlinInvoke
        }
        selectedWords.forEach( (word) => {
            gremlinInvoke = gremlinInvoke
                .call("addV", word.selectedMorphologyInfoType)
                .call("property", word.selectedMorphologyInfoType, word.tag)
                .call("as", vertexAlias(word))
            if (word.beginningMorphologyInfoType !== undefined) {
                gremlinInvoke = gremlinInvoke
                .call("as", aliases.sourcePatternBeginning)
                .call("property", "isBeginning", true)
                .call("property", "owner", "Chin")
            }
        })
        selectedArcs.forEach( (arc) => {
            const startWord = selectedWords.find( word => word.indexInSentence == arc.trueStart )
            if (startWord === undefined
                || startWord.selectedMorphologyInfoType === undefined 
                || startWord.selectedMorphologyInfoType === ''
                ) {
                    const error = "dependency 起點沒被選取"
                    console.error(error)
                    throw error
                }
            let startVName = vertexAlias(startWord)
            let endVName = undefined
            if (isDependencyPlaceholder(arc, selectedWords)) { // 這個 dependency 後面連著連接處
                const connectorVName = "connector_" + arc.trueStart + "-" + arc.trueEnd
                endVName = connectorVName
                gremlinInvoke = gremlinInvoke
                .call("addV", "Connector")
                .call("as", connectorVName)
            } else {
                const endWord = selectedWords.find( word => word.indexInSentence == arc.trueEnd ) 
                endVName = vertexAlias(endWord)
            }
            gremlinInvoke = gremlinInvoke
            .call("addE", arc.label)
            .call("from", startVName)
            .call("to", endVName)
        })
        return gremlinInvoke
    }
    const processTargetPatternStoring = (segmentPieces, gremlinInvoke) => {
        // save target pattern
        let lastAddedPieceAlias
        segmentPieces.forEach((piece, pieceIdx) => {
            const currentPieceAlias = 'v' + pieceIdx
            gremlinInvoke = gremlinInvoke
            .call("addV", vertexLabels.targetPattern)
            .call("property", "sourceType", piece.type)
            .call("as", currentPieceAlias)
            if (lastAddedPieceAlias) {
                gremlinInvoke = gremlinInvoke
                .call("addE", edgeLabels.follows)
                .call("to", lastAddedPieceAlias)
            } else {
                gremlinInvoke = gremlinInvoke
                .call("addE", edgeLabels.applicable)
                .call("to", aliases.sourcePatternBeginning)
            }
            lastAddedPieceAlias = currentPieceAlias
        })
        gremlinInvoke = gremlinInvoke
        .call("select", aliases.sourcePatternBeginning)
        return gremlinInvoke
    }

    return {
        spacyFormatSentences
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
            isDependencyPlaceholder: isDependencyPlaceholder
            , saveSelectedPattern: saveSelectedPattern
        }
    }
}
