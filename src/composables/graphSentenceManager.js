import { useStore } from "vuex"
import * as gremlinManager from "@/composables/gremlinManager"
import * as sourcePatternUtil from "@/composables/sourcePatternManager"
import * as sentenceManager from "@/composables/sentenceManager"

export default function(sourcePatternManager, targetPattern, spacyFormatSentences) {

    const store = useStore()

    const toggleMorphologySelection = (morphInfoType, tokenIndex) => {
        const sentence = currentSentence()
        const word = sentence.words[tokenIndex]
        if (word[morphInfoType.propertyInWord].endsWith(sentenceManager.morphologyInfoUnknownValuePostfix)) return

        store.dispatch('setToggling', true)

        const selectedArcs = sentence.arcs.filter( arc => arc.selected)
        if (selectedArcs.length > 0) { // 如果有選 dependency
            if (selectedArcs.filter( (selectedArc) => { // 選起來的 dependency 又都沒有連著現在要選的 token
                return (selectedArc.trueStart === tokenIndex || selectedArc.trueEnd === tokenIndex)
            }).length <= 0) return // 就不要選取
        }
        // TODO 選取還是都要連起來比較保險
        // 執行 toggle
        // TODO PROGRESS POS 固定要選起來，選了其他的，要自動標記 POS 有選
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
        sourcePatternManager.selection.reloadOptions().then( () => {
            findExistingMatchSourcePatternAndMark()
        })
    }

    const toggleDependencySelection = (dependency) => {
        store.dispatch('setToggling', true)

        if (dependency.selected || dependency.sourcePatternEdgeId) {
            dependency.sourcePatternEdgeId = undefined
            dependency.selected = undefined
            selectedSourcePattern.value = undefined
        } else {
            dependency.selected = !dependency.selected
        }
        sourcePatternManager.selection.reloadOptions().then( () => {
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
            sourcePatternManager.selection.setAsSelected(sourcePatternBeginningId)
        })
    }

    const selectedSourcePattern = sourcePatternManager.selection.selectedPattern
    const sourcePatternOptions = sourcePatternManager.selection.options

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

    return {
        toggleMorphologySelection
        , toggleDependencySelection
        , sourcePattern: {
            selected: selectedSourcePattern
            , options: sourcePatternOptions.value
        }
    }
}
