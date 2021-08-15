import { watch } from 'vue'
import { useStore } from "vuex"
import * as gremlinManager from "@/composables/gremlinManager"
import * as sourcePatternUtil from "@/composables/sourcePatternManager"
import { morphologyInfoTypeEnum } from "@/composables/morphologyInfo"

export default function(sourcePatternManager, targetPattern, spacyFormatSentences) {

    const store = useStore()
    let toggledFlag = false

    const toggleMorphologySelection = (morphInfoType, tokenIndex) => {
        toggledFlag = true

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
                selectedSourcePattern.value = undefined
                sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
                targetPattern.selection.clearSelection()
                targetPattern.selection.clearOptions()
                word.isBeginning = false
            }
        } else { // toggle on
            word.selectedMorphologyInfoTypes.push(morphInfoType)
            if (findBeginWord() === undefined) {
                word.isBeginning = true
            }
            // TODO PROGRESS POS 固定要選起來，選了其他的，要自動標記 POS 有選，這裡做反向控制
        }
        reloadMatchingSourcePatternOptions().then( () => {
            findExistingMatchSourcePatternAndMark()
        })
    }

    const toggleDependencySelection = (dependency) => {
        toggledFlag = true

        if (dependency.selected || dependency.sourcePatternEdgeId) {
            dependency.sourcePatternEdgeId = undefined
            dependency.selected = undefined
            selectedSourcePattern.value = undefined
        } else {
            dependency.selected = !dependency.selected
        }
        reloadMatchingSourcePatternOptions().then( () => {
            findExistingMatchSourcePatternAndMark()
        })
    }
    const findExistingMatchSourcePatternAndMark = () => {
        if (!findBeginWord()) return
        const selectedArcsFromBegin = currentSentence().arcs.filter( (arc) => {
            return (arc.selected && arc.trueStart === findBeginWord().indexInSentence)
        })
        if (selectedArcsFromBegin.length === 0) return
        let gremlinInvoke = new gremlinManager.GremlinInvoke()
        .call("V")
        const beginWord = findBeginWord()
        beginWord.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
            gremlinInvoke = gremlinInvoke.call("has", morphInfoType.name, beginWord[morphInfoType.propertyInWord])
        })
        gremlinInvoke.call(
            "where"
            , new gremlinManager.GremlinInvoke(true)
            .call("outE")
            .call("count")
            .call("is", selectedArcsFromBegin.length)
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
            gremlinInvoke.call(
                "and"
                , new gremlinManager.GremlinInvoke(true)
                .call("outE", key)
                .call("count")
                .call("is", value)
            )
        })
        // TODO 到這裡只完成第一層的 edge 判斷，還有後續的 vertex 和 edge 要查
        const gremlinCommand = gremlinInvoke.command()
        console.log(gremlinCommand)
        gremlinManager.submit(gremlinCommand).then( (resultData) => {
            if (resultData['@value'].length === 0) {
                sourcePatternUtil.clearSelection(selectedSourcePattern)
                sourcePatternUtil.clearOptions(sourcePatternOptions)
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

    const selectedSourcePattern = sourcePatternManager.selection.selectedPattern
    const sourcePatternOptions = sourcePatternManager.selection.options

    const reloadMatchingSourcePatternOptions = () => {
        sourcePatternOptions.value.splice(0, sourcePatternOptions.value.length)
        const beginWord = findBeginWord()
        if (! beginWord) {
            return new Promise( (resolve) => {
                resolve(undefined)
            })
        }
        let gremlinCommand = new gremlinManager.GremlinInvoke().call("V")
        beginWord.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
            gremlinCommand = gremlinCommand.call("has", morphInfoType.name, beginWord[morphInfoType.propertyInWord])
        })
        gremlinCommand = gremlinCommand.call("inE", 'applicable')
        .call("inV")
        .call("dedup")
        .command()
        return new Promise((resolve, reject) => {
            gremlinManager.submit(gremlinCommand).then( (resultData) => {
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
        const sentence = currentSentence()
        if (! toggledFlag) {
            sentence.clearSelection()
        }
        // TODO 這裡有點亂，待整理
        sentence.arcs.forEach( arc => arc.sourcePatternEdgeId = undefined)
        targetPattern.selection.clearOptions()
        if (newValue == undefined || newValue.id == undefined) {
            sentence.words.forEach( (word) => {
                word.sourcePatternVertexId = undefined
            })
            return
        }

        const currentBeginWord = findBeginWord()
        if (currentBeginWord == undefined) return
        
        const sourcePatternBeginningId = newValue.id
        currentBeginWord.sourcePatternVertexId = sourcePatternBeginningId
        autoMarkMatchingSourcePattern(sourcePatternBeginningId).then( () => {
            // 處理 target pattern
            targetPattern.selection.clearSelection()
            // TODO currentSentence 希望不用傳
            targetPattern.selection.reloadOptions(sourcePatternBeginningId, currentSentence()).then( (targetPattern) => {
                console.log('target pattern options reloaded: ', targetPattern)
            })
        })
    })

    const setSelectedSourcePatternDropdownValue = (id) => {
        selectedSourcePattern.value = sourcePatternOptions.value.find( (option) => {
            return option.id == id
        })
    }
    const autoMarkMatchingSourcePattern = (sourcePatternBeginningId) => {
        setSelectedSourcePatternDropdownValue(sourcePatternBeginningId)
        // 這裡必須要用 ==，因為 Primevue 的值是存 null，不是存 undefined
        if (selectedSourcePattern.value == undefined || selectedSourcePattern.value.id == undefined) {
            setSelectedSourcePatternDropdownValue(sourcePatternBeginningId)
        }
        const sentence = currentSentence()
        sentence.arcs.forEach( (dependency) => {
            dependency.sourcePatternEdgeId = undefined
        })

        let gremlinCommand = new gremlinManager.GremlinInvoke()
        .call("V", sourcePatternBeginningId)
        .call("repeat", new gremlinManager.GremlinInvoke(true).call("outE").call("inV"))
        .call("until", new gremlinManager.GremlinInvoke(true).call("outE").call("count").call("is", 0))
        .call("limit", 20)
        .call("path")
        .command()
        return new Promise( (resolve, reject) => {
            gremlinManager.submit(gremlinCommand).then( (resultData) => {
                findBeginWord().sourcePatternVertexId = sourcePatternBeginningId

                // TODO 這 2 個動作可能會造成以後的錯誤
                findBeginWord().selectedMorphologyInfoTypes.splice(0, findBeginWord().selectedMorphologyInfoTypes.length)
                findBeginWord().selectedMorphologyInfoTypes.push(morphologyInfoTypeEnum.pos)

                resultData['@value'].forEach( (path) => {
                    const outVId = path['@value'].objects['@value'][0]['@value'].id['@value']
                    const outELabel = path['@value'].objects['@value'][1]['@value'].label
                    const outEId = path['@value'].objects['@value'][1]['@value'].id['@value'].relationId
                    const matchingArc = sentence.arcs.find( (arc) => {
                        return (
                            sentence.words[arc.trueStart].sourcePatternVertexId === outVId
                            && arc.label === outELabel
                        )
                    })
                    matchingArc.sourcePatternEdgeId = outEId
                    // 有了 sourcePatternEdgeId，視同被選取。應該要考慮用 getter 邏輯來處理
                    matchingArc.selected = true
                })
                toggledFlag = false
                resolve(sourcePatternBeginningId)
            }).catch ( (error) => {
                console.error(error)
                reject(error)
            })
        })
    }

    const currentSentence = () => {
        return spacyFormatSentences[store.getters.currentSentenceIndex]
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

    const saveSelectedPattern = () => {
        let gremlinInvoke = new gremlinManager.GremlinInvoke()

        // TODO 判斷現在的 pattern 是不是既有的，是的話就不要再存
        gremlinInvoke = sourcePatternManager.selection.save(gremlinInvoke)
        gremlinInvoke = targetPattern.process.save(gremlinInvoke)
        gremlinInvoke.call("select", gremlinManager.aliases.sourcePatternBeginning)

        console.log(gremlinInvoke.command())
        gremlinManager.submit(gremlinInvoke.command())
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
    return {
        toggleMorphologySelection
        , toggleDependencySelection
        , sourcePattern: {
            selected: selectedSourcePattern
            , options: sourcePatternOptions.value
        }
        , patternHelper: {
            saveSelectedPattern: saveSelectedPattern
        }
    }
}
