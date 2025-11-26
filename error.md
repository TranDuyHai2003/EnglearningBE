[dotenv@17.2.3] injecting env (13) from .env -- tip: ≡ƒöæ add access controls to secrets: https://dotenvx.com/ops
node : D:\englearning\e
nglearning-backend\src\
routes\payments.js:28
At line:1 char:1
+ node src/index.js 
2>&1 | Out-File 
-Encoding utf8 error.md
+ 
~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo     
         : NotSpecifi  
  ed: (D:\englearnin   
 g\...\payments.js:    
28:String) [], Rem    
oteException
    + FullyQualifiedEr 
   rorId : NativeComm  
  andError
 
  requestRefund
  ^

ReferenceError: 
requestRefund is not 
defined
    at 
Object.<anonymous> (D:\
englearning\englearning
-backend\src\routes\pay
ments.js:28:3)
    at Module._compile 
(node:internal/modules/
cjs/loader:1706:14)
    at Object..js (node
:internal/modules/cjs/l
oader:1839:10)
    at Module.load (nod
e:internal/modules/cjs/
loader:1441:32)
    at Function._load (
node:internal/modules/c
js/loader:1263:12)
    at TracingChannel.t
raceSync (node:diagnost
ics_channel:322:14)
    at wrapModuleLoad (
node:internal/modules/c
js/loader:237:24)
    at Module.require (
node:internal/modules/c
js/loader:1463:12)
    at require (node:in
ternal/modules/helpers:
147:16)
    at 
Object.<anonymous> (D:\
englearning\englearning
-backend\src\index.js:1
8:23)

Node.js v22.20.0
