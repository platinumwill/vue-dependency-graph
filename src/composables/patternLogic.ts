import { ComputedRef, watch } from "vue"
import { useStore } from "vuex"

import * as gremlinApi from "@/composables/gremlinManager"
import { SourcePatternManager } from "@/composables/sourcePatternManager"
import { ModifiedSpacyDependency, ModifiedSpacySentence, morphologyInfoUnknownValuePostfix } from "./sentenceManager"
import { LinearTargetPattern } from "./targetPatternPieceManager"
import { MorphologyInfo, minimalMorphologyInfo, morphologyInfoTypeEnum } from "./morphologyInfo"

// TODO 變數名稱待調整
export default function patternManager (
    sourcePatternManager: SourcePatternManager
    , targetPattern: any
    , currentSentence: ComputedRef<ModifiedSpacySentence>
    ) {
    const saveSelectedPattern = () => {
        let gremlinInvoke = new gremlinApi.GremlinInvoke()

        gremlinInvoke = sourcePatternManager.process.save(gremlinInvoke)
        gremlinInvoke = targetPattern.process.save(gremlinInvoke)
        gremlinInvoke.call("select", gremlinApi.aliases.sourcePatternBeginning)

        console.log(gremlinInvoke.command())
        gremlinApi.submit(gremlinInvoke.command())
        .then((resultData: any) => {
            const sourcePatternBeginningVertexId = resultData['@value'][0]['@value'].id['@value']
            console.log('Source Pattern Begin Vertex Id: ', sourcePatternBeginningVertexId)
            sourcePatternManager.selection.reloadOptions().then(() => {
                sourcePatternManager.selection.setAsSelected(sourcePatternBeginningVertexId)
            })
            return sourcePatternBeginningVertexId
        }).catch(function(error) {
            console.error(error)
        })
    }

    const store = useStore()

    // 因為 watch source pattern 的邏輯牽涉到 target pattern，所以實做放在這裡
    watch(sourcePatternManager.selection.selectedPattern, async (newValue, oldValue) => {
        console.log('watching selected source pattern change: ', newValue, oldValue)
        // reset target patter 下拉選單
        targetPattern.selection.clearSelection()
        targetPattern.selection.clearOptions()

        const sentence = currentSentence.value
        if (! store.getters.toggling) {
            sentence.clearSelection()
        }
        sentence.arcs.forEach( arc => arc.sourcePatternEdgeId = undefined)
        sentence.words.forEach( word => word.sourcePatternVertexId = undefined)

        const currentBeginWord = currentSentence.value.findBeginWord()
        if (currentBeginWord == undefined || newValue == undefined) {
            store.dispatch('setToggling', false)
            return
        }
        
        const sourcePatternBeginningId = newValue.id
        currentBeginWord.sourcePatternVertexId = sourcePatternBeginningId
        await autoMarkMatchingSourcePattern(sourcePatternBeginningId).then( () => {
            targetPattern.selection.reloadOptions(sourcePatternBeginningId).then( (targetPatternOptions: LinearTargetPattern[]) => {
                console.log('target pattern options reloaded: ', targetPatternOptions)
            })
        })
        store.dispatch('setToggling', false)
    })

    const autoMarkMatchingSourcePattern = async (sourcePatternBeginningId: number) => {

        currentSentence.value.arcs.forEach( dependency => dependency.sourcePatternEdgeId = undefined)
        currentSentence.value.words.forEach( word => word.sourcePatternVertexId = undefined)

        // 下面的邏輯也許應該切到 setence manager

        const gremlinCommand = new gremlinApi.GremlinInvoke()
        .call("V", sourcePatternBeginningId)
        .call("repeat", new gremlinApi.GremlinInvoke(true).call("outE").call("inV"))
        .call("until", new gremlinApi.GremlinInvoke(true).call("outE").call("count").call("is", 0))
        .call("limit", 20)
        .call("path")
        // .call("by", new gremlinApi.GremlinInvoke(true).call("elementMap"))
        .command()

            // 下面這行不加開頭的 await 會有問題
            await gremlinApi.submit(gremlinCommand).then( async (resultData: any) => {
                const beginWord = currentSentence.value.findBeginWord()
                if (beginWord == undefined) return
                beginWord.sourcePatternVertexId = sourcePatternBeginningId

                // TODO 這 2 個動作可能會造成以後的錯誤
                beginWord.selectedMorphologyInfoTypes.splice(0, beginWord.selectedMorphologyInfoTypes.length)
                beginWord.selectedMorphologyInfoTypes.push(minimalMorphologyInfo)

                await resultData['@value'].forEach( async (path: any) => {
                    // 因為這裡是以 v -e-> v 的模式在處理，所以 source pattern 註定不能是單一個 token
                    const outVId = path['@value'].objects['@value'][0]['@value'].id['@value']
                    const outELabel = path['@value'].objects['@value'][1]['@value'].label
                    const outEId = path['@value'].objects['@value'][1]['@value'].id['@value'].relationId
                    const inVId = path['@value'].objects['@value'][2]['@value'].id['@value']
                    const matchingArc = currentSentence.value.arcs.find( (arc) => {
                        return (
                            currentSentence.value.words[arc.trueStart].sourcePatternVertexId === outVId
                            && arc.label === outELabel
                        )
                    })
                    if (! matchingArc) return
                    matchingArc.sourcePatternEdgeId = outEId
                    // 有了 sourcePatternEdgeId，視同被選取。應該要考慮用 getter 邏輯來處理
                    matchingArc.selected = true
                    
                    let pathEndIsConnector = false
                    gremlinApi.isConnector(inVId).then( (isConnector) => {
                        if (isConnector == undefined) return
                        pathEndIsConnector = isConnector
                    })
                    if (! pathEndIsConnector) {
                        const tokenAtEndOfDependency = currentSentence.value.words.find( (word) => {
                            return word.indexInSentence === matchingArc.trueEnd
                        })
                        if (tokenAtEndOfDependency == undefined) {
                            const error = '搜尋、自動標示 source pattern 的邏輯有問題'
                            console.error(error)
                            throw error
                        }
                        // token 的 source pattern vertex id 在這裡設定，這一行很重要
                        tokenAtEndOfDependency.sourcePatternVertexId = inVId
                    }

                    const tokenMatchingInV = currentSentence.value.words.find( (token) => {
                        return token.sourcePatternVertexId === inVId
                    })
                    if (tokenMatchingInV != undefined) {
                        await gremlinApi.loadValueMap(inVId).then( (outVValueMap: any) => {
                            const morphTypeInfoTokenPropertyNames = Object.values(morphologyInfoTypeEnum).map(infoType => infoType.name)
                            outVValueMap[gremlinApi.valueKey][0][gremlinApi.valueKey].forEach( (valueMapArrayElement: any, index: number) => {
                                const matchingMorphologyInfo = Object.values(morphologyInfoTypeEnum).find(infoType => infoType.name === valueMapArrayElement)
                                if (matchingMorphologyInfo == undefined) return
                                tokenMatchingInV.markMorphologyInfoAsSelected(matchingMorphologyInfo)
                            })
                        })
                    }

                })
            })
    }

    const toggleMorphologyInfoSelection = (morphologyInfo: MorphologyInfo) => {
        const sentence = currentSentence.value
        const word = morphologyInfo.token
        // 如果 morphology info 是 UNKNOWN，就不繼續動作
        if (word[morphologyInfo.type.propertyInWord].endsWith(morphologyInfoUnknownValuePostfix)) return

        store.dispatch('setToggling', true)

        const selectedArcs = sentence.arcs.filter( arc => arc.selected)
        if (selectedArcs.length > 0) { // 如果有選 dependency
            if (selectedArcs.filter( (selectedArc) => { // 選起來的 dependency 又都沒有連著現在要選的 token
                return (selectedArc.trueStart === morphologyInfo.token.indexInSentence || selectedArc.trueEnd === morphologyInfo.token.indexInSentence)
            }).length <= 0) return // 就不要選取
        }
        // TODO 選取還是都要連起來比較保險
        // 執行 toggle
        if (word.selectedMorphologyInfoTypes.includes(morphologyInfo.type)) { // toggle off
            word.unmarkMorphologyInfoAsSelected(morphologyInfo.type)
            word.sourcePatternVertexId = undefined
            word.isBeginning = false
            // 重新檢查然後標記每個 token 的 begin
            // 然後再針對每個 begin token 處理 source pattern
            // 這些要在新的 segment manager 做
        } else { // toggle on
            if (currentSentence.value.findBeginWord() === undefined) {
                word.isBeginning = true
            }            
            word.markMorphologyInfoAsSelected(morphologyInfo.type)
        }
        sourcePatternManager.selection.reloadOptions().then( () => {
            findExistingMatchSourcePatternAndSetDropdown(currentSentence.value, sourcePatternManager)
        })        
    }

    const toggleDependencySelection = (dependency: ModifiedSpacyDependency) => {
        store.dispatch('setToggling', true)

        if (dependency.selected || dependency.sourcePatternEdgeId) {
            dependency.sourcePatternEdgeId = undefined
            dependency.selected = false
            sourcePatternManager.selection.setAsSelected(undefined)
        } else {
            dependency.selected = !dependency.selected
        }
        sourcePatternManager.selection.reloadOptions().then( () => {
            findExistingMatchSourcePatternAndSetDropdown(currentSentence.value, sourcePatternManager)
        })
    }

    return {
        patternManager: {
            saveSelectedPattern: saveSelectedPattern
            , toggleMorphologyInfoSelection: toggleMorphologyInfoSelection
            , toggleDependencySelection: toggleDependencySelection
        }
    }

}
const findExistingMatchSourcePatternAndSetDropdown = (
    currentSentence: ModifiedSpacySentence
    , sourcePatternManager: SourcePatternManager
    ) => {

    const beginWord = currentSentence.findBeginWord()
    if (! beginWord) return
    const selectedArcsFromBegin = currentSentence.arcs.filter( (arc) => {
        return (arc.selected && arc.trueStart === beginWord.indexInSentence)
    })
    if (selectedArcsFromBegin.length === 0) return
    let gremlinInvoke = new gremlinApi.GremlinInvoke()
    .call("V")
    beginWord.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
        gremlinInvoke = gremlinInvoke.call("has", morphInfoType.name, beginWord[morphInfoType.propertyInWord])
    })
    gremlinInvoke.call(
        "where"
        , new gremlinApi.GremlinInvoke(true)
        .call("outE")
        .call("count")
        .call("is", new gremlinApi.GremlinInvoke(true).gte(selectedArcsFromBegin.length))
    )
    const arcSum = new Map();
    selectedArcsFromBegin.forEach( (selectedArc) => {
        if ( arcSum.has(selectedArc.label) ) {
            arcSum.set(selectedArc.label, arcSum.get(selectedArc.label) + 1)
        } else {
            arcSum.set(selectedArc.label, 1)
        }
        // 目前暫時支援查詢到第 1 層的 edge 和隨後的 vertex。如果要再支搜查詢到更後面的線和端，就要用遞迴了
        if (selectedArc.endToken && selectedArc.endToken?.selectedMorphologyInfoTypes.length > 0) {
            const endToken = selectedArc.endToken
            const endTokenCriteria = new gremlinApi.GremlinInvoke(true).out(selectedArc.label)
            Object.values(morphologyInfoTypeEnum).forEach( (morphInfoType, index) => {
                const endTokenPropertyCriteria = new gremlinApi.GremlinInvoke(true)
                if (endToken.selectedMorphologyInfoTypes.includes(morphInfoType)) {
                    endTokenPropertyCriteria.has(morphInfoType.name, endToken[morphInfoType.propertyInWord])
                } else {
                    endTokenPropertyCriteria.hasNot(morphInfoType.name)
                }
                const whereOrAnd = index === 0 ? 'where' : 'and'
                endTokenCriteria.call(whereOrAnd, endTokenPropertyCriteria)
            })
            gremlinInvoke.and(endTokenCriteria)
        } else {
            // connector 的狀況
            gremlinInvoke.and(
                new gremlinApi.GremlinInvoke(true)
                .out(selectedArc.label)
                .where(new gremlinApi.GremlinInvoke(true).has(gremlinApi.propertyNames.isConnector, true))
                .count()
                .is(new gremlinApi.GremlinInvoke(true).eq(1))
            )
        }
    })
    arcSum.forEach( (value, key) => {
        gremlinInvoke.call(
            "and"
            , new gremlinApi.GremlinInvoke(true)
            .call("outE", key)
            .call("count")
            .call("is", new gremlinApi.GremlinInvoke(true).gte(value))
        )
    })
    gremlinApi.submit(gremlinInvoke).then( (resultData: any) => {
        if (resultData['@value'].length === 0) {
            sourcePatternManager.selection.setAsSelected(undefined)
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
