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
import * as documentPersistence from '@/composables/document/document-persistence'
import * as backendAgent from "@/composables/backend-agent"

import { computed, ComputedRef, ref, watch } from "vue";

export type TranslationHelper = {
    saveSelectedPattern: Function
    , toggleMorphologyInfoSelection: Function
    , isTargetPatternConfirmed: boolean
}

export async function prepareTranslationHelper (
    sourcePattern: SourcePatternManager
    , targetPattern: TargetPattern
) {

    const $sourcePattern: SourcePatternManager = sourcePattern
    const $targetPattern: TargetPattern|undefined = targetPattern
    let $toggling = false

    const _toggleMorphologyInfoSelection = async (morphologyInfo: MorphologyInfo) => {
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
            if (word.outDeps.length) {
                word.isBeginning = true // isBeginning 要在這裡控制嗎？要不要做成自動判斷？
            }
            word.markMorphologyInfoAsSelected(morphologyInfo.type)
        }

        const selection = $sourcePattern?.selection
        if (!selection) throw 'selection 為空，有誤'
        await selection.reloadOptions().then( async () => {
            return await _findExistingMatchSourcePatternAndSetDropdown(word, selection)
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

    // status control / 狀態控制
    enum SegmentStatus {
        TargetPatternConfirmed = 'TargetPatternConfirmed'
    }
    const status = ref<string | undefined>(undefined)
    const toggleSegmentTranslationConfirmed = (
        targetPatternHelperCopy: TargetPattern
        , document: documentPersistence.Document
        ) => {

        // 把已經確認的 target pattern 選取值，和 target pattern pieces 存起來
        targetPattern.dialogPieces.pieces = targetPatternHelperCopy.dialogPieces.pieces
        targetPattern.selection.selected = targetPatternHelperCopy.selection.selected
        // 切換狀態
        if (status.value) {
            status.value = undefined
        } else {
            status.value = SegmentStatus.TargetPatternConfirmed
            // 儲存 segment 初步翻譯
            if (! targetPattern.token.sentence) return
            console.log('document', document)
            documentPersistence.saveInitialSegmentTranslation(
                targetPattern
                , document
                )
        }
    }
    const isTargetPatternConfirmed: ComputedRef<boolean> = computed( () => {
        return status.value == SegmentStatus.TargetPatternConfirmed
    })

    const watchSourcePattern = async (newValue:SourcePatternOption, oldValue:SourcePatternOption) => {
        console.log('watching selected source pattern change: ', newValue, oldValue)

        if (! $targetPattern) throw '不應該執行到這裡，$targetPattern 必須有值'

        // reset target patter 下拉選單
        $targetPattern.selection.clearSelection()
        $targetPattern.selection.clearOptions()

        const currentBeginWord = $targetPattern.token

        // 如果不是 toggling（也就是用選的，或是清除），
        // 就要清除 sourceXxxId 和 selected 狀態        
        if (! $toggling) { // 這個判斷要用 state machine 記錄一下
            currentBeginWord.clearSegmentSelection()
        }
        
        // 如果是 toggling，
        // 就只要清除 sourceXxxId 就好，也就是保留原本的 selected 狀態
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
        , toggleSegmentTranslationConfirmed
        , isTargetPatternConfirmed
    }
}


const saveSelectedPattern = async (
    sourcePattern: SourcePatternManager
    , targetPattern: TargetPattern
) => {
// TODO convert to aws = done
    let gremlinInvoke = new GremlinInvoke()

    gremlinInvoke = await sourcePattern.process.save(gremlinInvoke)
    .then(targetPattern.process.save)
    // .then(backendAgent.triggerPatternSaving)
    // .then(async (gremlinInvoke: GremlinInvoke) => {return gremlinInvoke.call("select", aliases.sourcePatternBeginning)})
    // .then(async (gremlinInvoke: GremlinInvoke) => {return submit(gremlinInvoke.command())})
    // console.log(gremlinInvoke.command())
    // await 
    .then(async (resultData: any) => {
        const sourcePatternBeginningVertexId = resultData.sourcePatternBeginningVertexId
        console.log('Source Pattern Begin Vertex Id: ', sourcePatternBeginningVertexId)
        sourcePattern.selection.reloadOptions().then(() => {
            sourcePattern.selection.setAsSelected(sourcePatternBeginningVertexId)
            // return sourcePatternBeginningVertexId
        })
        return sourcePatternBeginningVertexId
    })
    .catch(function(error: any) {
        console.error(error)
    })
}

const _findExistingMatchSourcePatternAndSetDropdown = async (
    beginWord: ModifiedSpacyToken
    , selection: SourcePatternSegmentSelection
    ) => {

    // 如果不是 segment root，就不需要往下查詢以這個 token 為 root 的 source pattern
    if (! beginWord.isSegmentRoot) return 

    const selectedArcsFromBegin = beginWord.segmentDeps
// TODO convert to aws = done
    let gremlinInvoke = new GremlinInvoke()
    .call("V")
    beginWord.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
        gremlinInvoke = gremlinInvoke.call("has", morphInfoType.name, beginWord[morphInfoType.propertyInWord])
    })
    if (selectedArcsFromBegin.length) {
        gremlinInvoke.where(
// TODO convert to aws = done
            new GremlinInvoke(true)
            .outE()
            .count()
// TODO convert to aws = done
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
// TODO convert to aws = done
            const endTokenCriteria = new GremlinInvoke(true).out(selectedArc.label)

            // 因為除了有的 morph info 要下 has，還要針對要沒有的 morph info 要下 hasNot 排除掉，所以要轉整個 morphologyInfoTypeEnum
            Object.values(morphologyInfoTypeEnum).forEach( (morphInfoType, index) => {
// TODO convert to aws = done
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
// TODO convert to aws = done
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
// TODO convert to aws = done
            , new GremlinInvoke(true)
            .call("outE", key)
            .call("count")
// TODO convert to aws = done
            .call("is", new GremlinInvoke(true).gte(value))
        )
    })

    // for aws
    let seq = 0
    const depArray: any[] = []
    const beginWordForRemote = backendAgent.generateTokenForAWS(beginWord)
    beginWord.segmentDeps.forEach((dep => {
        seq++
        depArray.push(backendAgent.generateDependencyForAWS(dep, seq))
    }))
    await backendAgent.querySourcePattern(beginWordForRemote, depArray, arcSum).then((queryResult: any[]) => {
        if (queryResult.length === 0) {
            selection.setAsSelected(undefined)
            return
        }
        selection.setAsSelected(queryResult[0].id)
    })
    
    return

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
// TODO convert to aws = done
    const gremlinCommand = new GremlinInvoke()
    .call("V", sourcePatternBeginningId)
// TODO convert to aws = done
    .call("repeat", new GremlinInvoke(true).call("outE").call("inV"))
// TODO convert to aws = done
    .call("until", new GremlinInvoke(true).call("outE").call("count").call("is", 0))
    .call("limit", 20)
    .call("path")
    .command()

        // 下面這行不加開頭的 await 會有問題
        // 問題可能出在這裡，不知道下面的 await 的邏輯是不是要搬到外面
        await submit(gremlinCommand).then( async (resultData: any) => {
            if (token == undefined) return
        })

        // for aws
        await backendAgent.querySourcePatternById(sourcePatternBeginningId.toString()).then(async (sourcePatterns: {from: any, edge: any, to: any}[]) => {
            token.sourcePatternVertexId = sourcePatternBeginningId

            sourcePatterns.forEach(async (sourcePattern: any) => {

                // 因為這裡是以 v -e-> v 的模式在處理，所以 source pattern 註定不能是單一個 token
                const outVId = sourcePattern.from.id
                const outELabel = sourcePattern.edge.label
                const outEId = sourcePattern.edge.id.relationId
                const inVId = sourcePattern.to.id
                const matchingArc = token.outDeps.find( (arc) => {
                    return (
                        token.sentence?.words[arc.trueStart].sourcePatternVertexId === outVId
                        && arc.label === outELabel
                        // TODO 這裡可能還要再加上是否已經選取/是否已經有對應的 source pattern edge id 的判斷（為了要處理同個 label 有多個 edge 的狀況）
                    )
                })
                if (! matchingArc) return
                matchingArc.sourcePatternEdgeId = outEId
                // 有了 sourcePatternEdgeId，視同被選取。應該要考慮用 getter 邏輯來處理
                matchingArc.selected = true
                
                    if (! sourcePattern.to.isConnector) {
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

                const tokenMatchingInV = token.sentence?.words.find( (token) => {
                    return token.sourcePatternVertexId === inVId
                })
                //// ########################################
                if (tokenMatchingInV != undefined) {
                    Object.values(morphologyInfoTypeEnum).forEach(infoType => {
                        console.log('INO TYPE', infoType.name)
                        console.log('INO TYPE VALUE', sourcePattern.from[infoType.name])
                        if (sourcePattern.from[infoType.name] != undefined) {
                            tokenMatchingInV.markMorphologyInfoAsSelected(infoType)
                        }
                    })
                }

            })
        })
}
