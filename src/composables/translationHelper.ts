import { SourcePatternManager, SourcePatternSegmentSelection } from "@/composables/sourcePatternManager";
import { LinearTargetPattern, TargetPattern } from "@/composables/targetPattern";
import { aliases, GremlinInvoke, isConnector, loadValueMap, propertyNames, submit, valueKey } from "@/composables/gremlinManager";
import {
    minimalMorphologyInfo,
    MorphologyInfo
    , morphologyInfoTypeEnum
    , morphologyInfoUnknownValuePostfix
} from "@/composables/morphologyInfo"
import { ModifiedSpacyDependency, ModifiedSpacyToken } from "@/composables/sentenceManager";
import { SourcePatternOption } from "@/composables/sourcePatternSegment";

import { watch } from "vue";

export type TranslationHelper = {
    saveSelectedPattern: Function
    , toggleMorphologyInfoSelection: Function
}

export function prepareTranslationHelper (
    sourcePattern: SourcePatternManager
    , targetPattern: TargetPattern
) {

    const $sourcePattern: SourcePatternManager = sourcePattern
    const $targetPattern: TargetPattern|undefined = targetPattern
    let $toggling = false

    const _toggleMorphologyInfoSelection = (morphologyInfo: MorphologyInfo) => {
        const word = morphologyInfo.token
        // 如果 morphology info 是 UNKNOWN，就不繼續動作
        if (word[morphologyInfo.type.propertyInWord].endsWith(morphologyInfoUnknownValuePostfix)) return

        $toggling = true

        const selectedArcs = word.segmentDeps
        if (selectedArcs.length > 0) { // 如果有選 dependency
            if (selectedArcs.filter( (selectedArc) => { // 選起來的 dependency 又都沒有連著現在要選的 token
                return (selectedArc.trueStart === morphologyInfo.token.indexInSentence || selectedArc.trueEnd === morphologyInfo.token.indexInSentence)
            }).length <= 0) return // 就不要選取
        }
        // 執行 toggle
        if (word.selectedMorphologyInfoTypes.includes(morphologyInfo.type)) { // toggle off
            word.unmarkMorphologyInfoAsSelected(morphologyInfo.type)
            word.sourcePatternVertexId = undefined
            if (! word.selectedMorphologyInfoTypes.length) {
                word.isBeginning = false // isBeginning 要在這裡控制嗎？要不要做成自動判斷？
            }
            // 重新檢查然後標記每個 token 的 begin
            // 然後再針對每個 begin token 處理 source pattern
            // 這些要在新的 segment manager 做
        } else { // toggle on
            word.isBeginning = true // isBeginning 要在這裡控制嗎？要不要做成自動判斷？
            word.markMorphologyInfoAsSelected(morphologyInfo.type)
        }

        const selection = $sourcePattern?.selection
        if (!selection) throw 'selection 為空，有誤'
        selection.reloadOptions().then( () => {
            _findExistingMatchSourcePatternAndSetDropdown(word, selection)
        })
    }

    const _toggleDependencySelection = (dependency: ModifiedSpacyDependency) => {
        $toggling = true

        if (dependency.selected || dependency.sourcePatternEdgeId) {
            dependency.sourcePatternEdgeId = undefined
            dependency.selected = false
            $sourcePattern.selection.setAsSelected(undefined)
        } else {
            dependency.selected = !dependency.selected
        }
        $sourcePattern?.selection.reloadOptions().then( () => {
            if (! dependency.beginToken) {
                throw "dependency.beginToken 為空，程式有誤"
            }
            _findExistingMatchSourcePatternAndSetDropdown(dependency.beginToken, $sourcePattern?.selection)
        })
    }

    const watchSourcePattern = async (newValue:SourcePatternOption, oldValue:SourcePatternOption) => {
        console.log('watching selected source pattern change: ', newValue, oldValue)

        if (! $targetPattern) throw '不應該執行到這裡，$targetPattern 必須有值'

        // reset target patter 下拉選單
        $targetPattern.selection.clearSelection()
        $targetPattern.selection.clearOptions()

        if (! $toggling) {
            clearSegmentSelection($targetPattern.token)
        }
        
        const currentBeginWord = $targetPattern.token
        currentBeginWord.clearSourcePatternInfo()
        if (currentBeginWord == undefined || newValue == undefined) {
            $toggling = false
            return
        }
        
        const sourcePatternBeginningId = newValue.id
        currentBeginWord.sourcePatternVertexId = sourcePatternBeginningId
        await autoMarkMatchingSourcePattern(sourcePatternBeginningId, currentBeginWord).then( () => {
            if (! $targetPattern) throw '不應該執行到這裡'
            $targetPattern.selection.reloadOptions(sourcePatternBeginningId).then( (targetPatternOptions: LinearTargetPattern[]) => {
                console.log('target pattern options reloaded: ', targetPatternOptions)
            })
        })
        $toggling = false
    }

    watch(sourcePattern.selection.selectedPattern, watchSourcePattern)

    return {
        saveSelectedPattern: saveSelectedPattern
        , toggleMorphologyInfoSelection: _toggleMorphologyInfoSelection
        , toggleDependencySelection: _toggleDependencySelection
    }
}


const clearSegmentSelection = (token: ModifiedSpacyToken) => {
    token.segmentDeps.forEach( dep => dep.selected = false )
    token.segmentTokens.forEach( token => {
        token.selectedMorphologyInfoTypes.splice(0, token.selectedMorphologyInfoTypes.length)
    })
}

const saveSelectedPattern = (
    sourcePattern: SourcePatternManager
    , targetPattern: TargetPattern
) => {
    let gremlinInvoke = new GremlinInvoke()

    gremlinInvoke = sourcePattern.process.save(gremlinInvoke)
    gremlinInvoke = targetPattern.process.save(gremlinInvoke)
    gremlinInvoke.call("select", aliases.sourcePatternBeginning)

    console.log(gremlinInvoke.command())
    submit(gremlinInvoke.command())
    .then((resultData: any) => {
        const sourcePatternBeginningVertexId = resultData['@value'][0]['@value'].id['@value']
        console.log('Source Pattern Begin Vertex Id: ', sourcePatternBeginningVertexId)
        sourcePattern.selection.reloadOptions().then(() => {
            sourcePattern.selection.setAsSelected(sourcePatternBeginningVertexId)
        })
        return sourcePatternBeginningVertexId
    }).catch(function(error) {
        console.error(error)
    })
}

const _findExistingMatchSourcePatternAndSetDropdown = (
    beginWord: ModifiedSpacyToken
    , selection: SourcePatternSegmentSelection
    ) => {

    if (! beginWord) return
    const selectedArcsFromBegin = beginWord.segmentDeps
    let gremlinInvoke = new GremlinInvoke()
    .call("V")
    beginWord.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
        gremlinInvoke = gremlinInvoke.call("has", morphInfoType.name, beginWord[morphInfoType.propertyInWord])
    })
    if (selectedArcsFromBegin.length) {
        gremlinInvoke.where(
            new GremlinInvoke(true)
            .outE()
            .count()
            .is(new GremlinInvoke(true).eq(selectedArcsFromBegin.length))
        )
    }
    const arcSum = new Map();
    selectedArcsFromBegin.forEach( (selectedArc) => {
        if ( arcSum.has(selectedArc.label) ) {
            arcSum.set(selectedArc.label, arcSum.get(selectedArc.label) + 1)
        } else {
            arcSum.set(selectedArc.label, 1)
        }
        // 目前暫時支援查詢到第 1 層的 edge 和隨後的 vertex。如果要再支搜查詢到更後面的線和端，就要用遞迴了
        if (selectedArc.endToken && selectedArc.endToken?.selectedMorphologyInfoTypes.length > 0) {
            // 非 connector 的狀況
            const endToken = selectedArc.endToken
            const endTokenCriteria = new GremlinInvoke(true).out(selectedArc.label)
            Object.values(morphologyInfoTypeEnum).forEach( (morphInfoType, index) => {
                const endTokenPropertyCriteria = new GremlinInvoke(true)
                if (endToken.selectedMorphologyInfoTypes.includes(morphInfoType)) {
                    endTokenPropertyCriteria.has(morphInfoType.name, endToken[morphInfoType.propertyInWord])
                } else {
                    endTokenPropertyCriteria.hasNot(morphInfoType.name)
                }
                const whereOrAnd = index === 0 ? 'where' : 'and'
                endTokenCriteria.call(whereOrAnd, endTokenPropertyCriteria)
            })
            gremlinInvoke.where(endTokenCriteria)
        } else {
            // connector 的狀況
            gremlinInvoke.where(
                new GremlinInvoke(true)
                .out(selectedArc.label)
                .where(new GremlinInvoke(true).has(propertyNames.isConnector, true))
                .count()
                .is(new GremlinInvoke(true).eq(1))
            )
        }
    })
    arcSum.forEach( (value, key) => {
        gremlinInvoke.call(
            "and"
            , new GremlinInvoke(true)
            .call("outE", key)
            .call("count")
            .call("is", new GremlinInvoke(true).gte(value))
        )
    })
    submit(gremlinInvoke).then( (resultData: any) => {
        if (resultData['@value'].length === 0) {
            selection.setAsSelected(undefined)
            return
        }
        const sourcePatternBeginningId = resultData['@value'][0]['@value'].id['@value']
        selection.setAsSelected(sourcePatternBeginningId)
    })
}

const autoMarkMatchingSourcePattern = async (sourcePatternBeginningId: number, token: ModifiedSpacyToken) => {

    token.clearSourcePatternInfo()

    // 下面的邏輯也許應該切到 setence manager

    const gremlinCommand = new GremlinInvoke()
    .call("V", sourcePatternBeginningId)
    .call("repeat", new GremlinInvoke(true).call("outE").call("inV"))
    .call("until", new GremlinInvoke(true).call("outE").call("count").call("is", 0))
    .call("limit", 20)
    .call("path")
    // .call("by", new GremlinInvoke(true).call("elementMap"))
    .command()

        // 下面這行不加開頭的 await 會有問題
        // 問題可能出在這裡，不知道下面的 await 的邏輯是不是要搬到外面
        await submit(gremlinCommand).then( async (resultData: any) => {
            if (token == undefined) return
            token.sourcePatternVertexId = sourcePatternBeginningId

            // TODO 這 2 個動作可能會造成以後的錯誤
            token.selectedMorphologyInfoTypes.splice(0, token.selectedMorphologyInfoTypes.length)
            token.selectedMorphologyInfoTypes.push(minimalMorphologyInfo)

            await resultData['@value'].forEach( async (path: any) => {
                // 因為這裡是以 v -e-> v 的模式在處理，所以 source pattern 註定不能是單一個 token
                const outVId = path['@value'].objects['@value'][0]['@value'].id['@value']
                const outELabel = path['@value'].objects['@value'][1]['@value'].label
                const outEId = path['@value'].objects['@value'][1]['@value'].id['@value'].relationId
                const inVId = path['@value'].objects['@value'][2]['@value'].id['@value']
                const matchingArc = token.outDeps.find( (arc) => {
                    return (
                        token.sentence?.words[arc.trueStart].sourcePatternVertexId === outVId
                        && arc.label === outELabel
                    )
                })
                if (! matchingArc) return
                matchingArc.sourcePatternEdgeId = outEId
                // 有了 sourcePatternEdgeId，視同被選取。應該要考慮用 getter 邏輯來處理
                matchingArc.selected = true
                
                let pathEndIsConnector = false
                isConnector(inVId).then( (isConnector) => {
                    if (isConnector == undefined) return
                    pathEndIsConnector = isConnector
                })
                if (! pathEndIsConnector) {
                    const tokenAtEndOfDependency = token.sentence?.words.find( (word) => {
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

                const tokenMatchingInV = token.segmentTokens.find( (token) => {
                    return token.sourcePatternVertexId === inVId
                })
                if (tokenMatchingInV != undefined) {
                    await loadValueMap(inVId).then( (outVValueMap: any) => {
                        const morphTypeInfoTokenPropertyNames = Object.values(morphologyInfoTypeEnum).map(infoType => infoType.name)
                        outVValueMap[valueKey][0][valueKey].forEach( (valueMapArrayElement: any, index: number) => {
                            const matchingMorphologyInfo = Object.values(morphologyInfoTypeEnum).find(infoType => infoType.name === valueMapArrayElement)
                            if (matchingMorphologyInfo == undefined) return
                            tokenMatchingInV.markMorphologyInfoAsSelected(matchingMorphologyInfo)
                        })
                    })
                }

            })
        })
}
