import * as vscode from 'vscode'
import * as constants from './constants'
import * as textProcessor from './text-processor'
import * as htmlLoader from './html-loader'
import {AngularComponent} from './models/angular-component'
import { HtmlDom } from './models/html-dom'

export async function getWorkspaceAngularComponents() : Promise<any[]> {
    let angularComponents: AngularComponent[] = []
    let uris: vscode.Uri[] = await vscode.workspace.findFiles('**/*.ts', constants.excludedFolders)
    if(!uris.length) {
        vscode.window.showInformationMessage('No ts files found')
        return []
    }
    let promises: Thenable<vscode.TextDocument>[] = []
    uris.forEach( (uri: vscode.Uri) => {
        let promise =  vscode.workspace.openTextDocument(uri)
        promises.push(promise)
    })
    let docs: vscode.TextDocument[] = await Promise.all(promises)
    let startPosition: vscode.Position = new vscode.Position(0, 0)
    docs.forEach(doc => {
        let endPosition: vscode.Position = new vscode.Position(doc.lineCount, 0)
        let fullRange: vscode.Range = new vscode.Range(startPosition, endPosition)
        let tsText: string = doc.getText(fullRange)
        let componentIndex = tsText.indexOf('@Component')
        if(componentIndex !== -1) {
            tsText = tsText.substring(componentIndex)
            let componentString = textProcessor.encodeTemplate(tsText)
            let objectStartIndex = componentString.indexOf('{')
            let objectEndIndex = componentString.indexOf('}')
            if(objectStartIndex !== -1 && objectEndIndex !== -1) {
                componentString = componentString.substring(objectStartIndex, objectEndIndex + 1)
                componentString = textProcessor.prepareJsonForParse(componentString)
                let component: AngularComponent = JSON.parse(componentString)
                component.fullPath = doc.uri.fsPath
                angularComponents.push(component)
            }
        }
    })
    return angularComponents
    
}

export function getAngularTree(angularComponents : AngularComponent[], htmlDoms : HtmlDom[]) {
    
}

export function mapDomsToComponent(angularComponents : AngularComponent[], htmlDoms : HtmlDom[]) : AngularComponent[] {
    let bar = "\\" //TO DO linux/mac
    angularComponents.forEach( component => {
        if(component.templateUrl) {
            let splitPath = component.fullPath.split(bar)
            splitPath.pop()

            let templateSplitPath = component.templateUrl.split("/")
            let firstGoBack = true
            for(let i = 0; i < templateSplitPath.length; ++i) {
               
                if(templateSplitPath[i] == '..') {
                    splitPath.pop()
                    if(!firstGoBack) templateSplitPath[i] = ''
                    firstGoBack = false
                } 
                else if(templateSplitPath[i] != '.') break
            }
            templateSplitPath = templateSplitPath.filter(p => p != '')
            templateSplitPath[0] = splitPath.join(bar)
            let templatePath = templateSplitPath.join(bar)
            let componentDom: HtmlDom = htmlDoms.find(d => d.fullPath === templatePath) || new HtmlDom
            component.dom = componentDom
        } else if(component.template) {
            let dom = htmlLoader.loadDom(component.template)
            component.dom = dom
        }
     })
     return angularComponents
}
