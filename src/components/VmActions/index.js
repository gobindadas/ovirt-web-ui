import React from 'react'
import PropTypes from 'prop-types'

import { connect } from 'react-redux'
import { Link } from 'react-router-dom'

import style from './style.css'

import {
  Checkbox,
  canRestart,
  canShutdown,
  canStart,
  canConsole,
  canSuspend,
  canRemove,
} from 'ovirt-ui-components'

import {
  shutdownVm,
  restartVm,
  suspendVm,
  startPool,
  startVm,
  removeVm,
} from '../../actions/index'
import { hrefWithoutHistory } from '../../helpers'

import Confirmation from '../Confirmation/index'
import Popover from '../Confirmation/Popover'
import ConsoleButton from './ConsoleButton'

class Button extends React.Component {
  constructor (props) {
    super(props)
    this.state = { show: false }
    this.handleClick = e => {
      this.setState({ show: !this.state.show })
    }
    this.closePopover = this.closePopover.bind(this)
  }

  closePopover () {
    this.setState({ show: false })
  }

  render () {
    let {
      className,
      tooltip = '',
      actionDisabled = false,
      isOnCard,
      onClick,
      shortTitle,
      button,
      popover,
    } = this.props

    let handleClick = hrefWithoutHistory(onClick)
    let popoverComponent = null
    if (popover) {
      handleClick = this.handleClick
      const PopoverBody = popover
      popoverComponent = (<Popover show={this.state.show} width={200} height={80} target={this} placement={isOnCard ? 'top' : 'bottom'}>
        <PopoverBody close={this.closePopover} />
      </Popover>)
    }

    if (actionDisabled) {
      className = `${className} ${style['action-disabled']}`
      handleClick = undefined
    }

    if (isOnCard) {
      return (
        <div className='card-pf-item'>
          <span className={className} data-toggle='tooltip' data-placement='left' title={tooltip} onClick={handleClick} />
          {popoverComponent}
        </div>
      )
    }

    if (actionDisabled) {
      return (
        <button className={`${button} ${style['disabled-button']}`} disabled='disabled'>
          <span data-toggle='tooltip' data-placement='left' title={tooltip}>
            {shortTitle}
          </span>
        </button>
      )
    }

    return (
      <span className={style['full-button']}>
        <a href='#' onClick={handleClick} className={`${button} ${style['link']}`} id={shortTitle}>
          <span data-toggle='tooltip' data-placement='left' title={tooltip}>
            {shortTitle}
          </span>
        </a>
        {popoverComponent}
      </span>
    )
  }
}
Button.propTypes = {
  className: PropTypes.string.isRequired,
  tooltip: PropTypes.string,
  shortTitle: PropTypes.string.isRequired,
  button: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  actionDisabled: PropTypes.bool,
  isOnCard: PropTypes.bool.isRequired,
  popover: PropTypes.func,
}

const LinkButton = ({ className, tooltip, to, actionDisabled, isOnCard, shortTitle, button }) => {
  if (actionDisabled) {
    className = `${className} ${style['action-disabled']}`
    to = undefined
  }

  if (isOnCard) {
    return (
      <div className='card-pf-item'>
        <Link to={to}>
          <span className={className} data-toggle='tooltip' data-placement='left' title={tooltip} />
        </Link>
      </div>
    )
  }

  if (actionDisabled) {
    return (
      <button className={`${button} ${style['disabled-button']}`} disabled='disabled'>
        <span data-toggle='tooltip' data-placement='left' title={tooltip}>
          {shortTitle}
        </span>
      </button>
    )
  }

  return (
    <Link to={to} className={`${button} ${style['link']} ${style['full-button']}`}>
      <span data-toggle='tooltip' data-placement='left' title={tooltip}>
        {shortTitle}
      </span>
    </Link>
  )
}

LinkButton.propTypes = {
  className: PropTypes.string.isRequired,
  tooltip: PropTypes.string,
  shortTitle: PropTypes.string.isRequired,
  button: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  actionDisabled: PropTypes.bool,
  isOnCard: PropTypes.bool.isRequired,
}

const EmptyAction = ({ state, isOnCard }) => {
  if (!canConsole(state) && !canShutdown(state) && !canRestart(state) && !canStart(state)) {
    return (
      <div className={isOnCard ? 'card-pf-item' : undefined} />
    )
  }
  return null
}
EmptyAction.propTypes = {
  state: PropTypes.string,
  isOnCard: PropTypes.bool.isRequired,
}

class RemoveVmAction extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      preserveDisks: false,
    }
  }

  render () {
    const { isOnCard, isPool, vm, onRemove, isDisks } = this.props

    if (isOnCard) {
      return null
    }

    let checkbox = null
    let height = null

    if (isDisks) {
      checkbox = (<div style={{ marginTop: '8px' }}><Checkbox checked={this.state.preserveDisks}
        onClick={() => this.setState({ preserveDisks: !this.state.preserveDisks })}
        label='Preserve disks' /></div>)
      height = 75
    }
    let confirmRemoveText = null
    if (checkbox) {
      confirmRemoveText = (
        <div>
          Remove the VM?
          <br />
          {checkbox}
        </div>)
    } else {
      confirmRemoveText = 'Remove the VM?'
    }

    const status = vm.get('status')
    const isDisabled = isPool || vm.getIn(['actionInProgress', 'remove']) || !canRemove(status)

    return (
      <Button isOnCard={false} actionDisabled={isDisabled}
        className='pficon pficon-remove'
        tooltip='Remove the VM'
        button='btn btn-danger'
        shortTitle='Remove'
        popover={({ close }) => <Confirmation
          height={height}
          text={confirmRemoveText}
          okButton={{ label: 'Yes', click: () => onRemove({ force: false, preserveDisks: this.state.preserveDisks }) }}
          cancelButton={{ label: 'Cancel', click: () => { close() } }}
          extraButton={{ label: 'force', click: () => onRemove({ force: true, preserveDisks: this.state.preserveDisks }) }}
        />}
      />
    )
  }
}
RemoveVmAction.propTypes = {
  vm: PropTypes.object.isRequired,
  isOnCard: PropTypes.bool,
  isPool: PropTypes.bool,
  onRemove: PropTypes.func.isRequired,
  isDisks: PropTypes.bool,
}

/**
 * Active actions on a single VM-card.
 * List of actions depends on the VM state.
 */
class VmActions extends React.Component {
  render () {
    let {
      vm,
      pool,
      isOnCard = false,
      onStartVm,
      onStartPool,
      isPool,
      onRemove,
    } = this.props

    let onStart = onStartVm
    if (isPool && pool) {
      onStart = onStartPool
    }
    if (isPool && !pool) {
      return null
    }

    const status = vm.get('status')

    let consoleProtocol = ''
    if (!vm.get('consoles').isEmpty()) {
      const vConsole = vm.get('consoles').find(c => c.get('protocol') === 'spice') ||
        vm.getIn(['consoles', 0])
      const protocol = vConsole.get('protocol').toUpperCase()
      consoleProtocol = `Open ${protocol} Console`
    }

    if (vm.get('consoleInUse')) {
      consoleProtocol = 'Console in use'
    }

    return (
      <div className={`actions-line ${isOnCard ? 'card-pf-items text-center' : style['left-padding']}`}>
        <EmptyAction state={status} isOnCard={isOnCard} />

        <Button isOnCard={isOnCard} actionDisabled={(!isPool && !canStart(status)) || vm.getIn(['actionInProgress', 'start'])}
          shortTitle='Start'
          button='btn btn-success'
          className='fa fa-play'
          tooltip='Start the VM'
          onClick={onStart} />

        <Button isOnCard={isOnCard} actionDisabled={isPool || !canSuspend(status) || vm.getIn(['actionInProgress', 'suspend'])}
          shortTitle='Suspend'
          button='btn btn-default'
          className='fa fa-moon-o'
          tooltip='Suspend the VM'
          popover={({ close }) => <Confirmation text='Suspend the VM?' okButton={{ label: 'Yes', click: this.props.onSuspend }} cancelButton={{ label: 'Cancel', click: () => { close() } }} />} />

        <Button isOnCard={isOnCard} actionDisabled={isPool || !canShutdown(status) || vm.getIn(['actionInProgress', 'shutdown'])}
          className='fa fa-power-off'
          button='btn btn-danger'
          tooltip='Shut down the VM'
          shortTitle='Shut down'
          popover={({ close }) => <Confirmation text='Shut down the VM?' okButton={{ label: 'Yes', click: this.props.onShutdown }} cancelButton={{ label: 'Cancel', click: () => { close() } }} />} />

        <Button isOnCard={isOnCard} actionDisabled={isPool || !canRestart(status) || vm.getIn(['actionInProgress', 'restart'])}
          className='pficon pficon-restart'
          button='btn btn-default'
          tooltip='Reboot the VM'
          shortTitle='Reboot'
          popover={({ close }) => <Confirmation text='Restart the VM?' okButton={{ label: 'Yes', click: this.props.onRestart }} cancelButton={{ label: 'Cancel', click: () => { close() } }} />} />

        <ConsoleButton isOnCard={isOnCard} actionDisabled={isPool || !canConsole(status) || vm.getIn(['actionInProgress', 'getConsole'])}
          button='btn btn-default'
          className='pficon pficon-screen'
          tooltip={consoleProtocol}
          shortTitle='Console'
          vm={vm} />

        <LinkButton isOnCard={isOnCard}
          shortTitle='Edit'
          button='btn btn-primary'
          className={`pficon pficon-edit ${style['action-link']}`}
          tooltip='Edit the VM' to={`/vm/${vm.get('id')}/edit`} />

        <RemoveVmAction isOnCard={isOnCard} isPool={isPool} vm={vm} isDisks={vm.get('disks').size > 0} onRemove={onRemove} />
      </div>
    )
  }
}

VmActions.propTypes = {
  vm: PropTypes.object.isRequired,
  isOnCard: PropTypes.bool,
  isPool: PropTypes.bool,
  pool: PropTypes.object,
  onShutdown: PropTypes.func.isRequired,
  onRestart: PropTypes.func.isRequired,
  onForceShutdown: PropTypes.func.isRequired,
  onSuspend: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onStartPool: PropTypes.func.isRequired,
  onStartVm: PropTypes.func.isRequired,
}

export default connect(
  (state) => ({
    icons: state.icons,
  }),
  (dispatch, { vm, pool }) => ({
    onShutdown: () => dispatch(shutdownVm({ vmId: vm.get('id'), force: false })),
    onRestart: () => dispatch(restartVm({ vmId: vm.get('id'), force: false })),
    onForceShutdown: () => dispatch(shutdownVm({ vmId: vm.get('id'), force: true })),
    onSuspend: () => dispatch(suspendVm({ vmId: vm.get('id') })),
    onRemove: ({ preserveDisks, force }) => dispatch(removeVm({ vmId: vm.get('id'), force, preserveDisks })),
    onStartPool: () => dispatch(startPool({ poolId: pool.get('id') })),
    onStartVm: () => dispatch(startVm({ vmId: vm.get('id') })),
  })
)(VmActions)
